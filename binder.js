RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
};

(function (exports) {

    //noinspection UnnecessaryLocalVariableJS
    var PocketBinder = {
        options: {
            dataTagLeft: '{{',
            dataTagRight: '}}'
        },
        eval: function (scope, action) {
            return function () {
                return eval(action)
            }.call(scope)
        },
        from: function (selector) {
            var node = document.querySelector(selector)

            var model = {}
            model.render = compileTemplate(node, model)

            attachListeners(node, model)

            return model
        }
    }

    function attachListeners(node, model) {
        var dataModels = node.querySelectorAll('[data-model]')

        dataModels.forEach(function (modelNode) {
            const modelTarget = modelNode.getAttribute('data-model')

            if (modelNode.tagName.toLowerCase() == 'input') {
                if (modelNode.getAttribute('type') == 'text') {

                    PocketBinder.eval(model, 'this.' + modelTarget + ' = "' + modelNode.value + '"')

                    modelNode.onkeyup = function () {
                        PocketBinder.eval(model, 'this.' + modelTarget + ' = "' + modelNode.value + '"')
                        model.render()
                    }

                    modelNode.onkeydown = function () {
                        // model.render()
                    }
                }
                else if (modelNode.getAttribute('type') == 'number') {

                    PocketBinder.eval(model, 'this.' + modelTarget + ' = Number("' + modelNode.value + '")')

                    modelNode.oninput = function () {
                        PocketBinder.eval(model, 'this.' + modelTarget + ' = Number("' + modelNode.value + '")')
                        model.render()
                    }
                }
            }
        }.bind(model))

        node.querySelectorAll('[data-event-click]').forEach(function (node) {
            var action = node.getAttribute('data-event-click')

            node.onclick = function (e) {
                eval(action)
            }.bind(model)
        })
    }

    function compileTemplate(node, model) {
        var regex = new RegExp(RegExp.escape(PocketBinder.options.dataTagLeft) + '(.+?)' + RegExp.escape(PocketBinder.options.dataTagRight), 'g')

        const TYPE_TEXT = 3
        const TYPE_ELEMENT = 1

        function expandTemplate(node, model) {
            var newNode = node.cloneNode(false)

            if (newNode.nodeType == TYPE_TEXT) {
                newNode.nodeValue = newNode.nodeValue.replace(regex, function (match, inside) {
                    return PocketBinder.eval(model, inside)
                })
            }
            else if (newNode.nodeType == TYPE_ELEMENT) {
                for (var i = 0; i < newNode.attributes.length; i++) {

                    const attr = newNode.attributes.item(i)
                    const templateValue = attr.nodeValue

                    if (attr.nodeValue.indexOf(PocketBinder.options.dataTagLeft) != -1) {
                        attr.nodeValue = templateValue.replace(regex, function (match, inside) { return PocketBinder.eval(model, inside) })
                    }
                }

                node.childNodes.forEach(function (child) { newNode.appendChild(expandTemplate(child, model)) })
            }

            return newNode
        }

        function compileNodeRec(node, renderFunctions, model) {
            if (node.nodeType == TYPE_TEXT) {

                const templateValue = node.nodeValue

                if (templateValue.indexOf(PocketBinder.options.dataTagLeft) != -1) {
                    renderFunctions.push(function () {
                        node.nodeValue = templateValue.replace(regex, function (match, inside) { return eval(inside) }.bind(model))
                    })
                }
            }
            else if (node.nodeType == TYPE_ELEMENT) {

                for (var i = 0; i < node.attributes.length; i++) {

                    const attr = node.attributes.item(i)
                    const templateValue = attr.nodeValue

                    if (attr.nodeName.indexOf('data-repeat-') == 0) {
                        console.log(attr.nodeName)

                        const template = node.cloneNode(true)

                        renderFunctions.push(function () {
                            var list = PocketBinder.eval(model, attr.nodeValue)
                            const localVarName = attr.nodeName.split('-')[2]

                            while (node.firstChild) {
                                node.removeChild(node.firstChild)
                            }

                            var index = 0

                            if (list.forEach) {
                                list.forEach(function (element) {
                                    var submodel = { }
                                    submodel.__proto__ = model

                                    submodel[localVarName] = element
                                    submodel['__index'] = index
                                    index++

                                    var expandedNode = expandTemplate(template, submodel) // .childNodes

                                    while (expandedNode.firstChild) {
                                        node.appendChild(expandedNode.firstChild)
                                    }

                                })
                            }
                            else {
                                const localVarValue = localVarName
                                const localVarKey = attr.nodeName.split('-')[3]

                                for (var key in list) {
                                    if (list.hasOwnProperty(key)) {
                                        var submodel = { }
                                        submodel.__proto__ = model

                                        submodel['__index'] = index
                                        submodel[localVarKey] = key
                                        submodel[localVarValue] = list[key]
                                        index++

                                        var expandedNode = expandTemplate(template, submodel) // .childNodes

                                        while (expandedNode.firstChild) {
                                            node.appendChild(expandedNode.firstChild)
                                        }
                                    }
                                }
                            }

                        })

                    }

                    if (attr.nodeValue.indexOf(PocketBinder.options.dataTagLeft) != -1) {
                        renderFunctions.push(function () {
                            attr.nodeValue = templateValue.replace(regex, function (match, inside) { return eval(inside) }.bind(model))
                        })
                    }
                }

                node.childNodes.forEach(function (child) { compileNodeRec(child, renderFunctions, model) })
            }
        }

        var renderFunctions = []

        compileNodeRec(node, renderFunctions, model)

        return function () {
            renderFunctions.forEach(function (func) { func() })
        }
    }

    exports.PocketBinder = PocketBinder
})(window)