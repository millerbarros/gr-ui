'use strict';

(function(){
    angular.module('gr.ui.autofields.core', ['autofields', 'gr.ui.alert', 'textAngular'])
        .directive('grAutofields', ['$compile', '$parse', '$timeout', '$grAlert', function($compile, $parse, $timeout, $grAlert){
            return {
                restrict: 'A',
                link: function($scope, $element, $attrs){
                    if(!$attrs.name && !$attrs.grAutofields){ return false; };
                    var $getter = $parse($attrs.grAutofields),
                        $setter = $getter.assign,
                        grAutofields = $getter($scope),
                        init = function(){
                            var $input = angular.element('<auto:fields/>'),
                                $alert = $grAlert.new(),
                                $errors = [],
                                defaultOptions = {
                                    defaultOption: 'Selecione...',
                                    validation: {
                                        showMessages: false
                                    }
                                },
                                modalScope = $element.parents('.modal').eq(0).scope(),
                                defaults;
                            if(!grAutofields.options){ grAutofields.options = defaultOptions; }else{ angular.extend(grAutofields.options, defaultOptions); }
                            defaults = angular.copy(grAutofields);
                            if(grAutofields.schema){
                                $input.attr('fields', $attrs.grAutofields + '.schema');
                            }
                            if(grAutofields.data){
                                $input.attr('data', $attrs.grAutofields + '.data');
                            }
                            if(grAutofields.options){
                                $input.attr('options', $attrs.grAutofields + '.options');
                            }
                            $element.prepend($input).removeAttr('gr-autofields').attr({
                                'novalidate': true,
                                'ng-submit': $attrs.name + '.submit()'
                            });
                            $scope.$watch(function(){
                                return grAutofields.schema;
                            }, setErrors, true);
                            $scope.$watch(function(){
                                if($scope[$attrs.name].autofields){
                                    return $scope[$attrs.name].autofields.$error;
                                }else{
                                    return [];
                                }
                            }, checkError, true);
                            $scope.$watch(function(){ return modalScope ? true : false; }, function(hasModal){
                                if(hasModal){
                                    $alert.destroy();
                                    $alert = $grAlert.new(modalScope.modal.element);
                                }
                            }, true);
                            function setErrors(schema){
                                var errors = {};
                                function multipleRecursive(schema){
                                    var aux = {};
                                    angular.forEach(schema, function(item){
                                        if(item.type === 'multiple'){
                                            angular.forEach(multipleRecursive(item.fields), function(subitem){
                                                if(subitem.msgs){
                                                    aux[subitem.property] = subitem;
                                                }
                                            });
                                        }else if(item.msgs){
                                            aux[item.property] = item;
                                        }
                                    });
                                    return aux;
                                }
                                angular.forEach(multipleRecursive(schema), function(item, id){
                                    errors[id] = item.msgs;
                                });
                                grAutofields.errors = errors;
                                checkError();
                            }
                            function getError($error){
                                var _errors = [];
                                angular.forEach($error, function(errors, errorId){
                                    angular.forEach(errors, function(field){
                                        _errors.push(grAutofields.errors[field.$name][errorId]);
                                    });
                                });
                                return _errors;
                            };
                            function checkError($error){
                                var errors;
                                if($error){ errors = getError($error); }else{ errors = $errors; }
                                if(errors !== $errors){ $errors = errors; }
                                if($errors.length > 0 && $scope[$attrs.name].$submitted){
                                    $alert.show('danger', $errors);
                                }else{
                                    $alert.hide();
                                }
                            };
                            function submit(){
                                var field;
                                angular.forEach(getError($scope[$attrs.name].autofields.$error), function(value, id){
                                    if(!field){
                                        field = id;
                                    }
                                });
                                $timeout(function(){
                                    if(!$scope[$attrs.name].$submitted){
                                        $scope[$attrs.name].$setSubmitted(true);
                                        $scope.$apply();
                                    }
                                    if(!grAutofields.options.validation.enabled){
                                        grAutofields.options.validation.enabled = true
                                    };
                                    if($scope[$attrs.name].autofields.$invalid){
                                        checkError($scope[$attrs.name].autofields.$error);
                                    } else {
                                        grAutofields.submit(grAutofields.data);
                                    }
                                });
                            };
                            function reset(){
                                $timeout(function(){
                                    grAutofields = angular.copy(defaults);
                                    $scope[$attrs.name].$setPristine();
                                    $scope[$attrs.name].$submitted = false;
                                    $scope.$apply();
                                    $alert.hide();
                                });
                            };
                            function updateDefaults(){
                                defaults = angular.copy(grAutofields);
                            };
                            function hasChange(){
                                return !angular.equals(defaults.data, grAutofields.data);
                            };
                            if($element.find('[type="submit"]').length === 0){
                                $element.append('<button type="submit" class="hidden"/>');
                            }
                            $compile($element)($scope);
                            $timeout(function(){
                                $scope[$attrs.name].submit = submit;
                                $scope[$attrs.name].reset = reset;
                                $scope[$attrs.name].updateDefaults = updateDefaults;
                                $scope[$attrs.name].hasChange = hasChange;
                            });
                        };
                    $scope.$watch(function(){
                        return grAutofields;
                    }, function(newValue){
                        if(newValue){
                            $timeout(function(){
                                $setter($scope, newValue);
                                $scope.$apply();
                            });
                        }
                    }, true);
                    init();
                }
            }
        }]);
}());
(function(){
    angular.module('gr.ui.autofields.bootstrap', ['autofields.standard','ui.bootstrap'])
        .config(['$autofieldsProvider', function($autofieldsProvider){
            // Add Bootstrap classes
            $autofieldsProvider.settings.classes.container.push('form-group');
            $autofieldsProvider.settings.classes.input.push('form-control');
            $autofieldsProvider.settings.classes.label.push('control-label');
            // Create a textAngular Field Handler as (type: "html")
            $autofieldsProvider.registerHandler('html', function(directive, field, index){
                var fieldElements = $autofieldsProvider.field(directive, field, '<text-angular/>');
                fieldElements.fieldContainer.append(toolbar);
                fieldElements.input.removeClass('form-control');
                return fieldElements.fieldContainer;
            });
            // Override Checkbox Field Handler
            $autofieldsProvider.registerHandler('checkbox', function(directive, field, index){
                var fieldElements = $autofieldsProvider.field(directive, field, '<input/>');

                if(fieldElements.label) fieldElements.label.prepend(fieldElements.input);
                fieldElements.input.removeClass('form-control');
                fieldElements.label.addClass('form-control');

                return fieldElements.fieldContainer;
            });
            // Date Handler with Bootstrap Popover
            $autofieldsProvider.settings.dateSettings = {
                showWeeks: false,
                datepickerPopup: 'longDate'
            };
            $autofieldsProvider.settings.scope.datepickerOptions = {
                showWeeks: false
            };
            $autofieldsProvider.settings.scope.openCalendar = function($scope, property, e){
                e.preventDefault();
                e.stopPropagation();
                $scope[property] = !$scope[property];
            };
            $autofieldsProvider.registerHandler('date', function(directive, field, index){
                var showWeeks = field.showWeeks ? field.showWeeks : directive.options.dateSettings.showWeeks,
                    datepickerPopup = field.datepickerPopup ? field.datepickerPopup : directive.options.dateSettings.datepickerPopup,
                    inputAttrs = {
                    type:'text',
                    ngAttrTitle:'{{\'Click on calendar button to change\' | grTranslate}}',
                    showWeeks: showWeeks,
                    datepickerPopup: datepickerPopup,
                    datepickerOptions: 'datepickerOptions',
                    isOpen: '$property_cleanOpen',
                    currentText: '{{\'Today\' | grTranslate}}',
                    clearText: '{{\'Clear\' | grTranslate}}',
                    closeText: '{{\'Close\' | grTranslate}}'
                };
                if(!(field.attr && field.attr.disabled == true)){
                    field.$addons = [{
                        button: true,
                        icon: 'fa fa-fw fa-calendar',
                        attr: {
                            ngClick: 'openCalendar("$property_cleanOpen",$event)',
                            title: 'Change date'
                        }
                    }];
                }
                var fieldElements = $autofieldsProvider.field(directive, field, '<input disabled/>', inputAttrs);
                return fieldElements.fieldContainer;
            });
            // Static Field Handler
            $autofieldsProvider.registerHandler('static', function(directive, field, index){
                var showWeeks = field.showWeeks ? field.showWeeks : directive.options.dateSettings.showWeeks;
                var datepickerPopup = field.datepickerPopup ? field.datepickerPopup : directive.options.dateSettings.datepickerPopup;

                var fieldElements = $autofieldsProvider.field(directive, field, '<p/>');

                //Remove Classes & Attributes
                var input = angular.element('<p/>');
                input.attr('ng-bind', fieldElements.input.attr('ng-model'));
                input.addClass('form-control-static');
                fieldElements.input.replaceWith(input);

                return fieldElements.fieldContainer;
            });
            // Multiple Per Row Handler
            $autofieldsProvider.settings.classes.row = $autofieldsProvider.settings.classes.row || [];
            $autofieldsProvider.settings.classes.row.push('row');
            $autofieldsProvider.settings.classes.col = $autofieldsProvider.settings.classes.col || [];
            $autofieldsProvider.settings.classes.col.push('col-sm-$size');
            $autofieldsProvider.settings.classes.colOffset = $autofieldsProvider.settings.classes.colOffset || [];
            $autofieldsProvider.settings.classes.colOffset.push('col-sm-offset-$size');
            $autofieldsProvider.registerHandler('multiple', function(directive, field, index){
                var row = angular.element('<div/>');
                row.addClass(directive.options.classes.row.join(' '));

                angular.forEach(field.fields, function(cell, cellIndex){
                    var cellContainer = angular.element('<div/>')
                    var cellSize = cell.type != 'multiple' ? cell.columns || field.columns : field.columns;
                    cellContainer.addClass(directive.options.classes.col.join(' ').replace(/\$size/g,cellSize));

                    cellContainer.append($autofieldsProvider.createField(directive, cell, cellIndex));

                    row.append(cellContainer);
                })

                return row;
            });
            // Register Help Block Support
            $autofieldsProvider.settings.classes.helpBlock = $autofieldsProvider.settings.classes.helpBlock || [];
            $autofieldsProvider.settings.classes.helpBlock.push('help-block');
            $autofieldsProvider.registerMutator('helpBlock', function(directive, field, fieldElements){
                if(!field.help) return fieldElements;

                fieldElements.helpBlock = angular.element('<p/>');
                fieldElements.helpBlock.addClass(directive.options.classes.helpBlock.join(' '))
                fieldElements.helpBlock.html(field.help);
                fieldElements.fieldContainer.append(fieldElements.helpBlock);

                return fieldElements;
            });
            // Register Addon Support
            $autofieldsProvider.settings.classes.inputGroup = ['input-group'];
            $autofieldsProvider.settings.classes.inputGroupAddon = ['input-group-addon'];
            $autofieldsProvider.settings.classes.inputGroupAddonButton = ['input-group-btn'];
            $autofieldsProvider.settings.classes.button = ['btn','btn-default'];
            $autofieldsProvider.registerMutator('addons', function(directive, field, fieldElements){
                if(!(field.$addons || field.addons)) return fieldElements;

                fieldElements.inputGroup = angular.element('<div/>');
                fieldElements.inputGroup.addClass($autofieldsProvider.settings.classes.inputGroup.join(' '));

                var toAppend = [];
                angular.forEach(field.$addons || field.addons, function(addon){
                    var inputGroupAddon = angular.element('<span/>'),
                        button = null;
                    inputGroupAddon.addClass($autofieldsProvider.settings.classes.inputGroupAddon.join(' '));

                    if(addon.button){
                        inputGroupAddon.attr('class',$autofieldsProvider.settings.classes.inputGroupAddonButton.join(' '));
                        button = angular.element('<button type="button"/>');
                        button.addClass($autofieldsProvider.settings.classes.button.join(' '));
                        inputGroupAddon.append(button);
                    }
                    if(addon.icon != null){
                        var icon = angular.element('<i/>');
                        icon.addClass(addon.icon);
                        (button||inputGroupAddon).append(icon);
                    }
                    if(addon.content != null) (button||inputGroupAddon).html(addon.content);
                    if(addon.attr) $autofieldsProvider.setAttributes(directive, field, (button||inputGroupAddon), addon.attr);

                    if(addon.before) fieldElements.inputGroup.append(inputGroupAddon);
                    else toAppend.push(inputGroupAddon);
                })

                fieldElements.inputGroup.append(fieldElements.input);
                angular.forEach(toAppend, function(el){fieldElements.inputGroup.append(el)});

                fieldElements.fieldContainer.append(fieldElements.inputGroup);
                return fieldElements;
            })
            // Register Horizontal Form Support
            $autofieldsProvider.settings.layout = {
                type: 'basic',
                labelSize: 2,
                inputSize: 10
            };
            $autofieldsProvider.registerMutator('horizontalForm', function(directive, field, fieldElements){
                if(!(directive.options.layout && directive.options.layout.type == 'horizontal')){
                    directive.container.removeClass('form-horizontal');
                    return fieldElements;
                }
                // Classes & sizing
                var col = $autofieldsProvider.settings.classes.col[0];
                var colOffset = $autofieldsProvider.settings.classes.colOffset[0];
                var labelSize = field.labelSize ? field.labelSize : directive.options.layout.labelSize;
                var inputSize = field.inputSize ? field.inputSize : directive.options.layout.inputSize;
                //Add class to container
                directive.container.addClass('form-horizontal');
                // Add input container & sizing class
                var inputContainer = angular.element('<div/>');
                inputContainer.addClass(col.replace(/\$size/gi, inputSize));
                // Add label sizing class
                if(fieldElements.label && field.type != 'checkbox'){
                    fieldElements.label.addClass(col.replace(/\$size/gi, labelSize));
                    fieldElements.label.after(inputContainer);
                }else{
                    fieldElements.fieldContainer.prepend(inputContainer);
                    inputContainer.addClass(colOffset.replace(/\$size/g,labelSize));
                }
                // Add input container sizing class
                if(field.type == 'checkbox'){
                    fieldElements.fieldContainer.removeClass('checkbox');
                    var checkboxContainer = angular.element('<div/>');
                    checkboxContainer.addClass('checkbox');
                    checkboxContainer.append(fieldElements.label);
                    inputContainer.append(checkboxContainer);
                }else{
                    inputContainer.append(fieldElements.inputGroup || fieldElements.input);
                }
                // Move Help Block
                if(field.help){
                    inputContainer.append(fieldElements.helpBlock);
                }
                return fieldElements;
            }, {require:'helpBlock'});
        }]);
}());
(function(){
    angular.module('gr.ui.autofields.bootstrap.validation',['autofields.validation'])
        .config(['$tooltipProvider', function($tooltipProvider){
            $tooltipProvider.setTriggers({'keyup focus':'blur'});
            $tooltipProvider.options({
                placement:'top',
                animation:false
            });
        }])
        .config(['$autofieldsProvider', function($autofieldsProvider){
            // Add Validation Attributes
            $autofieldsProvider.settings.attributes.container.ngClass = '{\'has-error\':$form.$property_clean.$invalid && $options.validation.enabled, \'has-success\':$form.$property_clean.$valid && $options.validation.enabled, \'required\': $required}';
            $autofieldsProvider.settings.attributes.input.popover = '{{("+$autofieldsProvider.settings.validation.valid+") ? \'$validMsg\' : ($errorMsgs)}}';
            // Dont show popovers on these types
            // this is to avoid multiple scope errors with UI Bootstrap
            $autofieldsProvider.settings.noPopover = ['date'];
            // Validation Mutator
            $autofieldsProvider.registerMutator('bootstrap-validation', function(directive, field, fieldElements){
                //Check to see if validation should be added
                if(!fieldElements.validation || $autofieldsProvider.settings.noPopover.indexOf(field.type) != -1){
                    //If not enabled, remove validation hooks
                    fieldElements.input.removeAttr('popover');
                    return fieldElements;
                }
                // Add validation attributes
                if(fieldElements.msgs.length){
                    var popoverAttr = fieldElements.input.attr('popover')
                                        .replace(/\$validMsg/gi, fieldElements.validMsg)
                                        .replace(/\$errorMsgs/gi, fieldElements.msgs.join('+'));
                    fieldElements.input.attr({
                        'popover-trigger':'keyup focus',
                        'popover':popoverAttr
                    });
                }else{
                    fieldElements.input.removeAttr('popover');
                }
                return fieldElements;
            }, {require:'validation', override:true});
        }]);
}());
(function(){
    angular.module('gr.ui.autofields',['gr.ui.autofields.core', 'gr.ui.autofields.bootstrap','gr.ui.autofields.bootstrap.validation']);
}());

/** gr-autofields dependencies **/

(function(){
    /**
     * @license Autofields v2.1.6
     * (c) 2014 Justin Maier http://justmaier.github.io/angular-autoFields-bootstrap
     * License: MIT
     */
    (function(){
        angular.module('autofields.core', [])
            .provider('$autofields', function(){
                var autofields = {};

                // Helper Methods
                var helper = {
                    CamelToTitle: function (str){
                        return str
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, function (str){ return str.toUpperCase(); });
                    },
                    CamelToDash: function (str){
                        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                    },
                    LabelText: function(field){
                        return field.label || helper.CamelToTitle(field.property);
                    }
                };

                // Directive-wide Handler Default Settings
                autofields.settings = {
                    classes: {
                        container: [],
                        input: [],
                        label: []
                    },
                    attributes: {
                        container: {
                            'class': '$type'
                        },
                        input: {
                            id: '$property_clean',
                            name: '$property_clean',
                            type: '$type',
                            ngModel: '$data.$property',
                            placeholder: '$placeholder'
                        },
                        label: {}
                    },
                    container: '<div class="autofields" ng-form name="$form"></div>',
                    scope: {}
                };

                // Field Building Helpers
                // Add Attributes to Element
                var setAttributes = autofields.setAttributes = function(directive, field, el, attrs){
                    angular.forEach(attrs, function(value, attr){
                        if(value && typeof value == 'string'){
                            value = value
                                .replace(/\$form/g, directive.formStr)
                                .replace(/\$schema/g, directive.schemaStr)
                                .replace(/\$type/g, field.type || 'text')
                                .replace(/\$property_clean/g, field.property.replace(/\[|\]|\./g, ''))
                                .replace(/\$property/g, field.property)
                                .replace(/\$data/g, directive.dataStr)
                                .replace(/\$options/g, directive.optionsStr)
                                .replace(/\$required/g, field.attr ? (field.attr.required ? true : false) : false)
                                .replace(/\$placeholder/g, field.placeholder != null ? field.placeholder : helper.LabelText(field));
                        }
                        el.attr(helper.CamelToDash(attr), value);
                    });
                };
                // Standard Container for field
                var getFieldContainer = function(directive, field, attrs){
                    var fieldContainer = angular.element('<div/>');
                    attrs = angular.extend({}, autofields.settings.attributes.container, attrs);
                    setAttributes(directive, field, fieldContainer, attrs);
                    fieldContainer.addClass(autofields.settings.classes.container.join(' '));

                    return fieldContainer;
                };
                // Standard Label for field
                var getLabel = function(directive, field, attrs){
                    var label = angular.element('<label/>');
                    attrs = angular.extend({}, autofields.settings.attributes.label, attrs);
                    setAttributes(directive, field, label, attrs);
                    label.addClass(autofields.settings.classes.label.join(' '));
                    label.html(helper.LabelText(field));

                    return label;
                }
                // Standard Input for field
                var getInput = function(directive, field, html, attrs){
                    var input = angular.element(html);
                    attrs = angular.extend({}, autofields.settings.attributes.input, attrs, field.attr);
                    setAttributes(directive, field, input, attrs);
                    input.addClass(autofields.settings.classes.input.join(' '));

                    return input;
                }
                // Standard Field
                autofields.field = function(directive, field, html, attrs){
                    var fieldElements = {
                        fieldContainer: getFieldContainer(directive, field),
                        label: field.label != '' ? getLabel(directive, field) : null,
                        input: getInput(directive, field, html, attrs)
                    };
                    fieldElements.fieldContainer.append(fieldElements.label).append(fieldElements.input);

                    // Run Mutators
                    var mutatorsRun = [];
                    angular.forEach(mutators, function(mutator, key){
                        fieldElements = mutator(directive, field, fieldElements, mutatorsRun);
                        mutatorsRun.push(key);
                    });

                    return fieldElements;
                }

                // Update scope with items attached in settings
                autofields.updateScope = function(scope){
                    angular.forEach(autofields.settings.scope, function(value, property){
                        if(typeof value == 'function'){
                            scope[property] = function(){
                                var args = Array.prototype.slice.call(arguments, 0);
                                args.unshift(scope);
                                value.apply(this, args);
                            }
                        }else{
                            scope[property] = value;
                        }
                    })
                }

                // Handler Container
                var handlers = {};

                // Hook for handlers
                autofields.registerHandler = function(types, fn){
                    types = Array.isArray(types) ? types : [types];
                    angular.forEach(types, function(type){
                        handlers[type] = fn;
                    });
                }

                // Mutator Container
                var mutators = {};

                // Hook for mutators
                autofields.registerMutator = function(key, fn, options){
                    if(!mutators[key] || options.override){
                        mutators[key] = function(directive, field, fieldElements, mutatorsRun){
                            if(options && typeof options.require == 'string' && mutatorsRun.indexOf(options.require) == -1){
                                fieldElements = mutators[options.require];
                            }
                            if(mutatorsRun.indexOf(key) == -1) return fn(directive, field, fieldElements);
                        }
                    }
                }

                // Field Builder
                autofields.createField = function(directive, field, index){
                    var handler = field.type == null ? handlers.text : handlers[field.type];
                    if(handler == null){
                        console.warn(field.type+' not supported - field ignored');
                        return;
                    }
                    return handler(directive, field, index);
                };

                autofields.$get = function(){
                    return {
                        settings: autofields.settings,
                        createField: autofields.createField,
                        updateScope: autofields.updateScope
                    };
                };

                return autofields;
            })
            .directive('autoFields', ['$autofields','$compile', function($autofields, $compile){
                return {
                    restrict: 'E',
                    priority: 1,
                    replace: true,
                    compile: function(){
                        return function ($scope, $element, $attr){
                            // Scope Hooks
                            var directive = {
                                schemaStr: $attr.fields || $attr.autoFields,
                                optionsStr: $attr.options,
                                dataStr: $attr.data,
                                formStr: $attr.form || 'autofields',
                                classes: $attr['class'],
                                container: null,
                                formScope: null
                            };

                            //Helper Functions
                            var helper = {
                                extendDeep: function(dst){
                                    angular.forEach(arguments, function(obj){
                                        if (obj !== dst){
                                            angular.forEach(obj, function(value, key){
                                                if (dst[key] && dst[key].constructor && dst[key].constructor === Object){
                                                    helper.extendDeep(dst[key], value);
                                                } else {
                                                    dst[key] = value;
                                                }
                                            });
                                        }
                                    });
                                    return dst;
                                }
                            };

                            // Import Directive-wide Handler Default Settings Import
                            directive.options = angular.copy($autofields.settings);

                            // Build fields from schema using handlers
                            var build = function(schema){
                                schema = schema || $scope.$eval(directive.schemaStr);

                                // Create HTML
                                directive.container.html('');
                                angular.forEach(schema, function(field, index){
                                    var fieldEl = $autofields.createField(directive, field, index);
                                    directive.container.append(fieldEl);
                                });

                                // Create Scope
                                if(directive.formScope != null) directive.formScope.$destroy();
                                directive.formScope = $scope.$new();
                                directive.formScope.data = $scope[directive.dataStr];
                                directive.formScope.fields = schema;
                                $autofields.updateScope(directive.formScope);

                                // Compile Element with Scope
                                $compile(directive.container)(directive.formScope);
                            };

                            // Init and Watch
                            $scope.$watch(directive.optionsStr, function (newOptions, oldOptions){
                                helper.extendDeep(directive.options, newOptions);
                                if(newOptions !== oldOptions) build();
                            }, true);
                            $scope.$watch(directive.schemaStr, function (schema){
                                build(schema);
                            }, true);
                            $scope.$watch(directive.formStr, function (form){
                                directive.container.attr('name',directive.formStr);
                            });
                            $scope.$watch(function(){return $attr['class'];}, function (form){
                                directive.classes = $attr['class'];
                                directive.container.attr('class', directive.classes);
                            });

                            directive.container = angular.element(directive.options.container);
                            directive.container.attr('name',directive.formStr);
                            directive.container.attr('class',directive.classes);
                            $element.replaceWith(directive.container);
                        }
                    }
                }
            }]);
    }());
    (function(){
        angular.module('autofields.standard',['autofields.core'])
            .config(['$autofieldsProvider', function($autofieldsProvider){
                // Text Field Handler
                $autofieldsProvider.settings.fixUrl = true;
                $autofieldsProvider.registerHandler(['text','email','url','date','number','password'], function(directive, field, index){
                    var fieldElements = $autofieldsProvider.field(directive, field, '<input/>');

                    var fixUrl = (field.fixUrl ? field.fixUrl : directive.options.fixUrl);
                    if(field.type == 'url' && fixUrl) fieldElements.input.attr('fix-url','');

                    return fieldElements.fieldContainer;
                });

                // Select Field Handler
                $autofieldsProvider.settings.defaultOption = 'Select One';
                $autofieldsProvider.registerHandler('select', function(directive, field, index){
                    var defaultOption = (field.defaultOption ? field.defaultOption : directive.options.defaultOption);

                    var inputHtml = '<select><option value="">'+defaultOption+'</option></select>';
                    var inputAttrs = {
                        ngOptions: field.list
                    };

                    var fieldElements = $autofieldsProvider.field(directive, field, inputHtml, inputAttrs);

                    return fieldElements.fieldContainer;
                });

                //Textarea Field Handler
                $autofieldsProvider.settings.textareaRows = 3;
                $autofieldsProvider.registerHandler('textarea', function(directive, field, index){
                    var rows = field.rows ? field.rows : directive.options.textareaRows;
                    var fieldElements = $autofieldsProvider.field(directive, field, '<textarea/>', {rows: rows});

                    return fieldElements.fieldContainer;
                });

                //Checkbox Field Handler
                $autofieldsProvider.registerHandler('checkbox', function(directive, field, index){
                    var fieldElements = $autofieldsProvider.field(directive, field, '<input/>');

                    if(fieldElements.label) fieldElements.label.prepend(fieldElements.input);

                    return fieldElements.fieldContainer;
                });

                // Register Hide/Show Support
                $autofieldsProvider.settings.displayAttributes = ($autofieldsProvider.settings.displayAttributes || []).concat(['ng-if', 'ng-show', 'ng-hide']);
                $autofieldsProvider.registerMutator('displayAttributes',function(directive, field, fieldElements){
                    if(!field.attr) return fieldElements;

                    // Check for presence of each display attribute
                    angular.forEach($autofieldsProvider.settings.displayAttributes, function(attr){
                        var value = fieldElements.input.attr(attr);

                        // Stop if field doesn't have attribute
                        if(!value) return;

                        // Move attribute to parent
                        fieldElements.fieldContainer.attr(attr, value);
                        fieldElements.input.removeAttr(attr);
                    });

                    return fieldElements;
                });
            }])
            .directive('fixUrl', [function(){
                return {
                    restrict: 'A',
                    require: 'ngModel',
                    link: function (scope, element, attr, ngModel){
                        var urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.\-\?\=\&]*)$/i;

                        //Render formatters on blur...
                        var render = function(){
                            var viewValue = ngModel.$modelValue;
                            if (viewValue == null) return;
                            angular.forEach(ngModel.$formatters, function (formatter){
                                viewValue = formatter(viewValue);
                            })
                            ngModel.$viewValue = viewValue;
                            ngModel.$render();
                        };
                        element.bind('blur', render);

                        var formatUrl = function (value){
                            var test = urlRegex.test(value);
                            if (test){
                                var matches = value.match(urlRegex);
                                var reformatted = (matches[1] != null && matches[1] != '') ? matches[1] : 'http://';
                                reformatted += matches[2] + '.' + matches[3];
                                if (typeof matches[4] != "undefined") reformatted += matches[4]
                                value = reformatted;
                            }
                            return value;
                        }
                        ngModel.$formatters.push(formatUrl);
                        ngModel.$parsers.unshift(formatUrl);
                    }
                };
            }]);
    }());
    (function(){
        angular.module('autofields.validation', ['autofields.core'])
            .config(['$autofieldsProvider', function($autofieldsProvider){
                var helper = {
                    CamelToTitle: function (str){
                        return str
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, function (str){ return str.toUpperCase(); });
                    }
                };

                // Add Validation Settings
                $autofieldsProvider.settings.validation = {
                    enabled: true,
                    showMessages: true,
                    defaultMsgs: {
                        required: 'This field is required',
                        minlength: 'This is under minimum length',
                        maxlength: 'This exceeds maximum length',
                        min: 'This is under the minumum value',
                        max: 'This exceeds the maximum value',
                        email: 'This is not a valid email address',
                        valid: ''
                    },
                    invalid: '$form.$property_clean.$invalid && $form.$property_clean.$dirty',
                    valid: '$form.$property_clean.$valid'
                };

                // Add Validation Attributes
                $autofieldsProvider.settings.attributes.container.ngClass = "{'invalid':"+$autofieldsProvider.settings.validation.invalid+", 'valid':"+$autofieldsProvider.settings.validation.valid+"}";

                // Add Validation Mutator
                $autofieldsProvider.registerMutator('validation', function(directive, field, fieldElements){
                    //Check to see if validation should be added
                    fieldElements.validation = directive.options.validation.enabled && field.validate !== false;
                    if(!fieldElements.validation){
                        //If not enabled, remove validation hooks
                        fieldElements.fieldContainer.removeAttr('ng-class');
                        return fieldElements;
                    }

                    // Get Error Messages
                    fieldElements.msgs = [];
                    if(!directive.options.validation.showMessages) return fieldElements;
                    angular.forEach(angular.extend({}, directive.options.validation.defaultMsgs, field.msgs), function(message, error){
                        if(
                            (field.msgs && field.msgs[error] != null) ||
                            (field.type == error) ||
                            (field.attr &&
                                (field.attr[error] != null ||
                                field.attr['ng'+helper.CamelToTitle(error)] != null)
                            )
                        ){
                            fieldElements.msgs.push('('+directive.formStr+'.'+field.property+'.$error.'+error+'? \''+message+'\' : \'\')');
                        }
                    });
                    // Get Valid Message
                    fieldElements.validMsg = (field.msgs && field.msgs.valid)? field.msgs.valid : directive.options.validation.defaultMsgs.valid;

                    // Add validation attributes
                    if(fieldElements.msgs.length){
                        // Add message display with ng-show/ng-hide
                        // using a mutator that requires 'validation'
                    }

                    return fieldElements;
                });
            }]);
    }());
    (function(){
        angular.module('autofields',['autofields.standard','autofields.validation']);
        angular.module('autoFields',['autofields']); // Deprecated module name
    }());
    /*
    @license textAngular
    Author : Austin Anderson
    License : 2013 MIT
    Version 1.3.0

    See README.md or https://github.com/fraywing/textAngular/wiki for requirements and use.
    */
    !function(a,b){
        b ? b["true"]=a: b = b,
        angular.module("textAngularSetup",[]).value("taOptions",{toolbar:[["h1","h2","h3","h4","h5","h6","p","pre","quote"],["bold","italics","underline","strikeThrough","ul","ol","redo","undo","clear"],["justifyLeft","justifyCenter","justifyRight","indent","outdent"],["html","insertImage","insertLink","insertVideo","wordcount","charcount"]],classes:{focussed:"focussed",toolbar:"btn-toolbar",toolbarGroup:"btn-group",toolbarButton:"btn btn-default",toolbarButtonActive:"active",disabled:"disabled",textEditor:"form-control",htmlEditor:"form-control"},setup:{textEditorSetup:function(){},htmlEditorSetup:function(){}},defaultFileDropHandler:function(a,b){var c=new FileReader;return"image"===a.type.substring(0,5)?(c.onload=function(){""!==c.result&&b("insertImage",c.result,!0)},c.readAsDataURL(a),!0):!1}}).value("taSelectableElements",["a","img"]).value("taCustomRenderers",[{selector:"img",customAttribute:"ta-insert-video",renderLogic:function(a){var b=angular.element("<iframe></iframe>"),c=a.prop("attributes");angular.forEach(c,function(a){b.attr(a.name,a.value)}),b.attr("src",b.attr("ta-insert-video")),a.replaceWith(b)}}]).value("taTranslations",{html:{tooltip:"Toggle html / Rich Text"},heading:{tooltip:"Heading "},p:{tooltip:"Paragraph"},pre:{tooltip:"Preformatted text"},ul:{tooltip:"Unordered List"},ol:{tooltip:"Ordered List"},quote:{tooltip:"Quote/unqoute selection or paragraph"},undo:{tooltip:"Undo"},redo:{tooltip:"Redo"},bold:{tooltip:"Bold"},italic:{tooltip:"Italic"},underline:{tooltip:"Underline"},strikeThrough:{tooltip:"Strikethrough"},justifyLeft:{tooltip:"Align text left"},justifyRight:{tooltip:"Align text right"},justifyCenter:{tooltip:"Center"},indent:{tooltip:"Increase indent"},outdent:{tooltip:"Decrease indent"},clear:{tooltip:"Clear formatting"},insertImage:{dialogPrompt:"Please enter an image URL to insert",tooltip:"Insert image",hotkey:"the - possibly language dependent hotkey ... for some future implementation"},insertVideo:{tooltip:"Insert video",dialogPrompt:"Please enter a youtube URL to embed"},insertLink:{tooltip:"Insert / edit link",dialogPrompt:"Please enter a URL to insert"},editLink:{reLinkButton:{tooltip:"Relink"},unLinkButton:{tooltip:"Unlink"},targetToggle:{buttontext:"Open in New Window"}},wordcount:{tooltip:"Display words Count"},charcount:{tooltip:"Display characters Count"}}).run(["taRegisterTool","$window","taTranslations","taSelection",function(a,b,c,d){a("html",{iconclass:"fa fa-code",tooltiptext:c.html.tooltip,action:function(){this.$editor().switchView()},activeState:function(){return this.$editor().showHtml}});var e=function(a){return function(){return this.$editor().queryFormatBlockState(a)}},f=function(){return this.$editor().wrapSelection("formatBlock","<"+this.name.toUpperCase()+">")};angular.forEach(["h1","h2","h3","h4","h5","h6"],function(b){a(b.toLowerCase(),{buttontext:b.toUpperCase(),tooltiptext:c.heading.tooltip+b.charAt(1),action:f,activeState:e(b.toLowerCase())})}),a("p",{buttontext:"P",tooltiptext:c.p.tooltip,action:function(){return this.$editor().wrapSelection("formatBlock","<P>")},activeState:function(){return this.$editor().queryFormatBlockState("p")}}),a("pre",{buttontext:"pre",tooltiptext:c.pre.tooltip,action:function(){return this.$editor().wrapSelection("formatBlock","<PRE>")},activeState:function(){return this.$editor().queryFormatBlockState("pre")}}),a("ul",{iconclass:"fa fa-list-ul",tooltiptext:c.ul.tooltip,action:function(){return this.$editor().wrapSelection("insertUnorderedList",null)},activeState:function(){return this.$editor().queryCommandState("insertUnorderedList")}}),a("ol",{iconclass:"fa fa-list-ol",tooltiptext:c.ol.tooltip,action:function(){return this.$editor().wrapSelection("insertOrderedList",null)},activeState:function(){return this.$editor().queryCommandState("insertOrderedList")}}),a("quote",{iconclass:"fa fa-quote-right",tooltiptext:c.quote.tooltip,action:function(){return this.$editor().wrapSelection("formatBlock","<BLOCKQUOTE>")},activeState:function(){return this.$editor().queryFormatBlockState("blockquote")}}),a("undo",{iconclass:"fa fa-undo",tooltiptext:c.undo.tooltip,action:function(){return this.$editor().wrapSelection("undo",null)}}),a("redo",{iconclass:"fa fa-repeat",tooltiptext:c.redo.tooltip,action:function(){return this.$editor().wrapSelection("redo",null)}}),a("bold",{iconclass:"fa fa-bold",tooltiptext:c.bold.tooltip,action:function(){return this.$editor().wrapSelection("bold",null)},activeState:function(){return this.$editor().queryCommandState("bold")},commandKeyCode:98}),a("justifyLeft",{iconclass:"fa fa-align-left",tooltiptext:c.justifyLeft.tooltip,action:function(){return this.$editor().wrapSelection("justifyLeft",null)},activeState:function(a){var b=!1;return a&&(b="left"===a.css("text-align")||"left"===a.attr("align")||"right"!==a.css("text-align")&&"center"!==a.css("text-align")&&"justify"!==a.css("text-align")&&!this.$editor().queryCommandState("justifyRight")&&!this.$editor().queryCommandState("justifyCenter")&&!this.$editor().queryCommandState("justifyFull")),b=b||this.$editor().queryCommandState("justifyLeft")}}),a("justifyRight",{iconclass:"fa fa-align-right",tooltiptext:c.justifyRight.tooltip,action:function(){return this.$editor().wrapSelection("justifyRight",null)},activeState:function(a){var b=!1;return a&&(b="right"===a.css("text-align")),b=b||this.$editor().queryCommandState("justifyRight")}}),a("justifyCenter",{iconclass:"fa fa-align-center",tooltiptext:c.justifyCenter.tooltip,action:function(){return this.$editor().wrapSelection("justifyCenter",null)},activeState:function(a){var b=!1;return a&&(b="center"===a.css("text-align")),b=b||this.$editor().queryCommandState("justifyCenter")}}),a("indent",{iconclass:"fa fa-indent",tooltiptext:c.indent.tooltip,action:function(){return this.$editor().wrapSelection("indent",null)},activeState:function(){return this.$editor().queryFormatBlockState("blockquote")}}),a("outdent",{iconclass:"fa fa-outdent",tooltiptext:c.outdent.tooltip,action:function(){return this.$editor().wrapSelection("outdent",null)},activeState:function(){return!1}}),a("italics",{iconclass:"fa fa-italic",tooltiptext:c.italic.tooltip,action:function(){return this.$editor().wrapSelection("italic",null)},activeState:function(){return this.$editor().queryCommandState("italic")},commandKeyCode:105}),a("underline",{iconclass:"fa fa-underline",tooltiptext:c.underline.tooltip,action:function(){return this.$editor().wrapSelection("underline",null)},activeState:function(){return this.$editor().queryCommandState("underline")},commandKeyCode:117}),a("strikeThrough",{iconclass:"fa fa-strikethrough",action:function(){return this.$editor().wrapSelection("strikeThrough",null)},activeState:function(){return document.queryCommandState("strikeThrough")}}),a("clear",{iconclass:"fa fa-ban",tooltiptext:c.clear.tooltip,action:function(a,b){var c;this.$editor().wrapSelection("removeFormat",null);var e=angular.element(d.getSelectionElement()),f=function(a){a=angular.element(a);var b=a;angular.forEach(a.children(),function(a){var c=angular.element("<p></p>");c.html(angular.element(a).html()),b.after(c),b=c}),a.remove()};if(angular.forEach(e.find("ul"),f),angular.forEach(e.find("ol"),f),"li"===e[0].tagName.toLowerCase()){var g=e[0].parentNode.childNodes,h=[],i=[],j=!1;for(c=0;c<g.length;c++)g[c]===e[0]?j=!0:j?i.push(g[c]):h.push(g[c]);var k=angular.element(e[0].parentNode),l=angular.element("<p></p>");if(l.html(angular.element(e[0]).html()),0===h.length||0===i.length)0===i.length?k.after(l):k[0].parentNode.insertBefore(l[0],k[0]),0===h.length&&0===i.length?k.remove():angular.element(e[0]).remove();else{var m=angular.element("<"+k[0].tagName+"></"+k[0].tagName+">"),n=angular.element("<"+k[0].tagName+"></"+k[0].tagName+">");for(c=0;c<h.length;c++)m.append(angular.element(h[c]));for(c=0;c<i.length;c++)n.append(angular.element(i[c]));k.after(n),k.after(l),k.after(m),k.remove()}d.setSelectionToElementEnd(l[0])}var o=this.$editor(),p=function(a){a=angular.element(a),a[0]!==o.displayElements.text[0]&&a.removeAttr("class"),angular.forEach(a.children(),p)};angular.forEach(e,p),"li"!==e[0].tagName.toLowerCase()&&"ol"!==e[0].tagName.toLowerCase()&&"ul"!==e[0].tagName.toLowerCase()&&this.$editor().wrapSelection("formatBlock","default"),b()}});var g=function(a,b,c){var d=function(){c.updateTaBindtaTextElement(),c.hidePopover()};a.preventDefault(),c.displayElements.popover.css("width","375px");var e=c.displayElements.popoverContainer;e.empty();var f=angular.element('<div class="btn-group" style="padding-right: 6px;">'),g=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">100% </button>');g.on("click",function(a){a.preventDefault(),b.css({width:"100%",height:""}),d()});var h=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">50% </button>');h.on("click",function(a){a.preventDefault(),b.css({width:"50%",height:""}),d()});var i=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">25% </button>');i.on("click",function(a){a.preventDefault(),b.css({width:"25%",height:""}),d()});var j=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">Reset</button>');j.on("click",function(a){a.preventDefault(),b.css({width:"",height:""}),d()}),f.append(g),f.append(h),f.append(i),f.append(j),e.append(f),f=angular.element('<div class="btn-group" style="padding-right: 6px;">');var k=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-align-left"></i></button>');k.on("click",function(a){a.preventDefault(),b.css("float","left"),b.css("cssFloat","left"),b.css("styleFloat","left"),d()});var l=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-align-right"></i></button>');l.on("click",function(a){a.preventDefault(),b.css("float","right"),b.css("cssFloat","right"),b.css("styleFloat","right"),d()});var m=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-align-justify"></i></button>');m.on("click",function(a){a.preventDefault(),b.css("float",""),b.css("cssFloat",""),b.css("styleFloat",""),d()}),f.append(k),f.append(m),f.append(l),e.append(f),f=angular.element('<div class="btn-group">');var n=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-trash-o"></i></button>');n.on("click",function(a){a.preventDefault(),b.remove(),d()}),f.append(n),e.append(f),c.showPopover(b),c.showResizeOverlay(b)};a("insertImage",{iconclass:"fa fa-picture-o",tooltiptext:c.insertImage.tooltip,action:function(){var a;return a=b.prompt(c.insertImage.dialogPrompt,"http://"),a&&""!==a&&"http://"!==a?this.$editor().wrapSelection("insertImage",a,!0):void 0},onElementSelect:{element:"img",action:g}}),a("insertVideo",{iconclass:"fa fa-youtube-play",tooltiptext:c.insertVideo.tooltip,action:function(){var a;if(a=b.prompt(c.insertVideo.dialogPrompt,"https://"),a&&""!==a&&"https://"!==a){var d=a.match(/(\?|&)v=[^&]*/);if(d&&d.length>0){var e="https://www.youtube.com/embed/"+d[0].substring(3),f='<img class="ta-insert-video" src="https://img.youtube.com/vi/'+d[0].substring(3)+'/hqdefault.jpg" ta-insert-video="'+e+'" contenteditable="false" src="" allowfullscreen="true" frameborder="0" />';return this.$editor().wrapSelection("insertHTML",f,!0)}}},onElementSelect:{element:"img",onlyWithAttrs:["ta-insert-video"],action:g}}),a("insertLink",{tooltiptext:c.insertLink.tooltip,iconclass:"fa fa-link",action:function(){var a;return a=b.prompt(c.insertLink.dialogPrompt,"http://"),a&&""!==a&&"http://"!==a?this.$editor().wrapSelection("createLink",a,!0):void 0},activeState:function(a){return a?"A"===a[0].tagName:!1},onElementSelect:{element:"a",action:function(a,d,e){a.preventDefault(),e.displayElements.popover.css("width","435px");var f=e.displayElements.popoverContainer;f.empty(),f.css("line-height","28px");var g=angular.element('<a href="'+d.attr("href")+'" target="_blank">'+d.attr("href")+"</a>");g.css({display:"inline-block","max-width":"200px",overflow:"hidden","text-overflow":"ellipsis","white-space":"nowrap","vertical-align":"middle"}),f.append(g);var h=angular.element('<div class="btn-group pull-right">'),i=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on" title="'+c.editLink.reLinkButton.tooltip+'"><i class="fa fa-edit icon-edit"></i></button>');i.on("click",function(a){a.preventDefault();var f=b.prompt(c.insertLink.dialogPrompt,d.attr("href"));f&&""!==f&&"http://"!==f&&(d.attr("href",f),e.updateTaBindtaTextElement()),e.hidePopover()}),h.append(i);var j=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on" title="'+c.editLink.unLinkButton.tooltip+'"><i class="fa fa-unlink icon-unlink"></i></button>');j.on("click",function(a){a.preventDefault(),d.replaceWith(d.contents()),e.updateTaBindtaTextElement(),e.hidePopover()}),h.append(j);var k=angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on">'+c.editLink.targetToggle.buttontext+"</button>");"_blank"===d.attr("target")&&k.addClass("active"),k.on("click",function(a){a.preventDefault(),d.attr("target","_blank"===d.attr("target")?"":"_blank"),k.toggleClass("active"),e.updateTaBindtaTextElement()}),h.append(k),f.append(h),e.showPopover(d)}}}),a("wordcount",{display:'<div id="toolbarWC" style="display:block; min-width:100px;">Words:{{wordcount}}</div>',disabled:!0,wordcount:0,activeState:function(){var a=this.$editor().displayElements.text,b=a[0].innerHTML,c=b.replace(/(<[^>]*?>)/gi," "),d=c.match(/\S+/g),e=d&&d.length||0;return this.wordcount=e,this.$editor().wordcount=e,!1}}),a("charcount",{display:'<div id="toolbarCC" style="display:block; min-width:120px;">Characters:{{charcount}}</div>',disabled:!0,charcount:0,activeState:function(){var a=this.$editor().displayElements.text,b=a[0].innerText||a[0].textContent,c=b.replace(/(\r\n|\n|\r)/gm,"").replace(/^\s+/g," ").replace(/\s+$/g," ").length;return this.charcount=c,this.$editor().charcount=c,!1}})}]),
        /*
        @license textAngular
        Author : Austin Anderson
        License : 2013 MIT
        Version 1.3.6

        See README.md or https://github.com/fraywing/textAngular/wiki for requirements and use.
        */
        function(){"Use Strict";function a(a){try{return 0!==angular.element(a).length}catch(b){return!1}}function b(b,c){if(!b||""===b||q.hasOwnProperty(b))throw"textAngular Error: A unique name is required for a Tool Definition";if(c.display&&(""===c.display||!a(c.display))||!c.display&&!c.buttontext&&!c.iconclass)throw'textAngular Error: Tool Definition for "'+b+'" does not have a valid display/iconclass/buttontext value';q[b]=c}var c={ie:function(){for(var a,b=3,c=document.createElement("div"),d=c.getElementsByTagName("i");c.innerHTML="<!--[if gt IE "+ ++b+"]><i></i><![endif]-->",d[0];);return b>4?b:a}(),webkit:/AppleWebKit\/([\d.]+)/i.test(navigator.userAgent)},d=!1;c.webkit&&(document.addEventListener("mousedown",function(a){var b=a||window.event,c=b.target;if(d&&null!==c){for(var e=!1,f=c;null!==f&&"html"!==f.tagName.toLowerCase()&&!e;)e="true"===f.contentEditable,f=f.parentNode;e||(document.getElementById("textAngular-editableFix-010203040506070809").setSelectionRange(0,0),c.focus(),c.select&&c.select())}d=!1},!1),angular.element(document).ready(function(){angular.element(document.body).append(angular.element('<input id="textAngular-editableFix-010203040506070809" class="ta-hidden-input" unselectable="on" tabIndex="-1">'))}));var e=/^(address|article|aside|audio|blockquote|canvas|dd|div|dl|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hgroup|hr|noscript|ol|output|p|pre|section|table|tfoot|ul|video)$/i,f=/^(ul|li|ol)$/i,g=/^(address|article|aside|audio|blockquote|canvas|dd|div|dl|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hgroup|hr|noscript|ol|output|p|pre|section|table|tfoot|ul|video|li)$/i;String.prototype.trim||(String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,"")});var h,i,j,k,l;if(c.ie>8||void 0===c.ie){for(var m=document.styleSheets,n=0;n<m.length;n++)if((0===m[n].media.length||m[n].media.mediaText.match(/(all|screen)/gi))&&m[n].href&&m[n].href.match(/textangular\.(min\.|)css/gi)){h=m[n];break}h||(h=function(){var a=document.createElement("style");return c.webkit&&a.appendChild(document.createTextNode("")),document.getElementsByTagName("head")[0].appendChild(a),a.sheet}()),i=function(a,b){return k(h,a,b)},k=function(a,b,c){var d;return a.cssRules?d=Math.max(a.cssRules.length-1,0):a.rules&&(d=Math.max(a.rules.length-1,0)),a.insertRule?a.insertRule(b+"{"+c+"}",d):a.addRule(b,c,d),d},j=function(a){l(h,a)},l=function(a,b){a.removeRule?a.removeRule(b):a.deleteRule(b)}}angular.module("textAngular.factories",[]).factory("taBrowserTag",[function(){return function(a){return a?""===a?void 0===c.ie?"div":c.ie<=8?"P":"p":c.ie<=8?a.toUpperCase():a:c.ie<=8?"P":"p"}}]).factory("taApplyCustomRenderers",["taCustomRenderers","taDOM",function(a,b){return function(c){var d=angular.element("<div></div>");return d[0].innerHTML=c,angular.forEach(a,function(a){var c=[];a.selector&&""!==a.selector?c=d.find(a.selector):a.customAttribute&&""!==a.customAttribute&&(c=b.getByAttribute(d,a.customAttribute)),angular.forEach(c,function(b){b=angular.element(b),a.selector&&""!==a.selector&&a.customAttribute&&""!==a.customAttribute?void 0!==b.attr(a.customAttribute)&&a.renderLogic(b):a.renderLogic(b)})}),d[0].innerHTML}}]).factory("taFixChrome",function(){var a=function(a){for(var b=angular.element("<div>"+a+"</div>"),c=angular.element(b).find("span"),d=0;d<c.length;d++){var e=angular.element(c[d]);e.attr("style")&&e.attr("style").match(/line-height: 1.428571429;|color: inherit; line-height: 1.1;/i)&&(e.attr("style",e.attr("style").replace(/( |)font-family: inherit;|( |)line-height: 1.428571429;|( |)line-height:1.1;|( |)color: inherit;/gi,"")),e.attr("style")&&""!==e.attr("style")||(e.next().length>0&&"BR"===e.next()[0].tagName&&e.next().remove(),e.replaceWith(e[0].innerHTML)))}var f=b[0].innerHTML.replace(/style="[^"]*?(line-height: 1.428571429;|color: inherit; line-height: 1.1;)[^"]*"/gi,"");return f!==b[0].innerHTML&&(b[0].innerHTML=f),b[0].innerHTML};return a}).factory("taSanitize",["$sanitize","taDOM",function(a,b){function c(a){var b=a.children();b.length&&angular.forEach(b,function(a){var b=angular.element(a);d(b),c(b)})}function d(a){var b=a.attr("style");b&&angular.forEach(e,function(c){var d=c.property,e=a.css(d);if(c.values.indexOf(e)>=0&&b.toLowerCase().indexOf(d)>=0){a.css(d,"");var f=a.html(),g=c.tag;f="<"+g+">"+f+"</"+g+">",a.html(f)}})}var e=[{property:"font-weight",values:["bold"],tag:"b"},{property:"font-style",values:["italic"],tag:"i"}];return function(e,f,g){if(!g)try{var h=angular.element("<div>"+e+"</div>");d(h),c(h),e=h.html()}catch(i){}var j=angular.element("<div>"+e+"</div>");angular.forEach(b.getByAttribute(j,"align"),function(a){a.css("text-align",a.attr("align")),a.removeAttr("align")});var k;e=j[0].innerHTML;try{k=a(e),g&&(k=e)}catch(i){k=f||""}var l=k.match(/(<pre[^>]*>.*?<\/pre[^>]*>)/gi);var processedSafe=k.replace(/(&#(9|10);)*/gi,"");var m,n=/<pre[^>]*>.*?<\/pre[^>]*>/gi,o=0,p=0;for(k="";null!==(m=n.exec(processedSafe))&&o<l.length;)k+=processedSafe.substring(p,m.index)+l[o],p=m.index+m[0].length,o++;return k+processedSafe.substring(p)}}]).factory("taToolExecuteAction",["$q","$log",function(a,b){return function(c){void 0!==c&&(this.$editor=function(){return c});var d=a.defer(),e=d.promise,f=this.$editor();e["finally"](function(){f.endAction.call(f)});var g;try{g=this.action(d,f.startAction())}catch(h){b.error(h)}(g||void 0===g)&&d.resolve()}}]),angular.module("textAngular.DOM",["textAngular.factories"]).factory("taExecCommand",["taSelection","taBrowserTag","$document",function(a,b,c){var d=function(b,c){var d,e,f=b.find("li");for(e=f.length-1;e>=0;e--)d=angular.element("<"+c+">"+f[e].innerHTML+"</"+c+">"),b.after(d);b.remove(),a.setSelectionToElementEnd(d[0])},g=function(b){/(<br(|\/)>)$/i.test(b.innerHTML.trim())?a.setSelectionBeforeElement(angular.element(b).find("br")[0]):a.setSelectionToElementEnd(b)},h=function(a,b){var c=angular.element("<"+b+">"+a[0].innerHTML+"</"+b+">");a.after(c),a.remove(),g(c.find("li")[0])},i=function(a,c,d){for(var e="",f=0;f<a.length;f++)e+="<"+b("li")+">"+a[f].innerHTML+"</"+b("li")+">";var h=angular.element("<"+d+">"+e+"</"+d+">");c.after(h),c.remove(),g(h.find("li")[0])};return function(g,j){return g=b(g),function(k,l,m){var n,o,p,q,r,s,t,u=angular.element("<"+g+">");try{t=a.getSelectionElement()}catch(v){}var w=angular.element(t);if(void 0!==t){var x=t.tagName.toLowerCase();if("insertorderedlist"===k.toLowerCase()||"insertunorderedlist"===k.toLowerCase()){var y=b("insertorderedlist"===k.toLowerCase()?"ol":"ul");if(x===y)return d(w,g);if("li"===x&&w.parent()[0].tagName.toLowerCase()===y&&1===w.parent().children().length)return d(w.parent(),g);if("li"===x&&w.parent()[0].tagName.toLowerCase()!==y&&1===w.parent().children().length)return h(w.parent(),y);if(x.match(e)&&!w.hasClass("ta-bind")){if("ol"===x||"ul"===x)return h(w,y);var z=!1;return angular.forEach(w.children(),function(a){a.tagName.match(e)&&(z=!0)}),z?i(w.children(),w,y):i([angular.element("<div>"+t.innerHTML+"</div>")[0]],w,y)}if(x.match(e)){if(q=a.getOnlySelectedElements(),0===q.length)o=angular.element("<"+y+"><li>"+t.innerHTML+"</li></"+y+">"),w.html(""),w.append(o);else{if(1===q.length&&("ol"===q[0].tagName.toLowerCase()||"ul"===q[0].tagName.toLowerCase()))return q[0].tagName.toLowerCase()===y?d(angular.element(q[0]),g):h(angular.element(q[0]),y);p="";var A=[];for(n=0;n<q.length;n++)if(3!==q[n].nodeType){var B=angular.element(q[n]);if("li"===q[n].tagName.toLowerCase())continue;p+="ol"===q[n].tagName.toLowerCase()||"ul"===q[n].tagName.toLowerCase()?B[0].innerHTML:"span"!==q[n].tagName.toLowerCase()||"ol"!==q[n].childNodes[0].tagName.toLowerCase()&&"ul"!==q[n].childNodes[0].tagName.toLowerCase()?"<"+b("li")+">"+B[0].innerHTML+"</"+b("li")+">":B[0].childNodes[0].innerHTML,A.unshift(B)}o=angular.element("<"+y+">"+p+"</"+y+">"),A.pop().replaceWith(o),angular.forEach(A,function(a){a.remove()})}return void a.setSelectionToElementEnd(o[0])}}else{if("formatblock"===k.toLowerCase()){for(s=m.toLowerCase().replace(/[<>]/gi,""),"default"===s.trim()&&(s=g,m="<"+g+">"),o="li"===x?w.parent():w;!o[0].tagName||!o[0].tagName.match(e)&&!o.parent().attr("contenteditable");)o=o.parent(),x=(o[0].tagName||"").toLowerCase();if(x===s){q=o.children();var C=!1;for(n=0;n<q.length;n++)C=C||q[n].tagName.match(e);C?(o.after(q),r=o.next(),o.remove(),o=r):(u.append(o[0].childNodes),o.after(u),o.remove(),o=u)}else if(o.parent()[0].tagName.toLowerCase()!==s||o.parent().hasClass("ta-bind"))if(x.match(f))o.wrap(m);else{for(q=a.getOnlySelectedElements(),0===q.length&&(q=[o[0]]),n=0;n<q.length;n++)if(3===q[n].nodeType||!q[n].tagName.match(e))for(;3===q[n].nodeType||!q[n].tagName||!q[n].tagName.match(e);)q[n]=q[n].parentNode;if(angular.element(q[0]).hasClass("ta-bind"))o=angular.element(m),o[0].innerHTML=q[0].innerHTML,q[0].innerHTML=o[0].outerHTML;else if("blockquote"===s){for(p="",n=0;n<q.length;n++)p+=q[n].outerHTML;for(o=angular.element(m),o[0].innerHTML=p,q[0].parentNode.insertBefore(o[0],q[0]),n=q.length-1;n>=0;n--)q[n].parentNode&&q[n].parentNode.removeChild(q[n])}else for(n=0;n<q.length;n++)o=angular.element(m),o[0].innerHTML=q[n].innerHTML,q[n].parentNode.insertBefore(o[0],q[n]),q[n].parentNode.removeChild(q[n])}else{var D=o.parent(),E=D.contents();for(n=0;n<E.length;n++)D.parent().hasClass("ta-bind")&&3===E[n].nodeType&&(u=angular.element("<"+g+">"),u[0].innerHTML=E[n].outerHTML,E[n]=u[0]),D.parent()[0].insertBefore(E[n],D[0]);D.remove()}return void a.setSelectionToElementEnd(o[0])}if("createlink"===k.toLowerCase()){var F=a.getSelection();if(F.collapsed)return void a.insertHtml('<a href="'+m+'">'+m+"</a>",j)}else if("inserthtml"===k.toLowerCase())return void a.insertHtml(m,j)}}try{c[0].execCommand(k,l,m)}catch(v){}}}}]).service("taSelection",["$window","$document","taDOM",function(a,b,c){var d=b[0],f=a.rangy,h=function(a,b){return a.tagName&&a.tagName.match(/^br$/i)&&0===b&&!a.previousSibling?{element:a.parentNode,offset:0}:{element:a,offset:b}},i={getSelection:function(){var a=f.getSelection().getRangeAt(0),b=a.commonAncestorContainer,c={start:h(a.startContainer,a.startOffset),end:h(a.endContainer,a.endOffset),collapsed:a.collapsed};return b=3===b.nodeType?b.parentNode:b,c.container=b.parentNode===c.start.element||b.parentNode===c.end.element?b.parentNode:b,c},getOnlySelectedElements:function(){var a=f.getSelection().getRangeAt(0),b=a.commonAncestorContainer;return b=3===b.nodeType?b.parentNode:b,a.getNodes([1],function(a){return a.parentNode===b})},getSelectionElement:function(){return i.getSelection().container},setSelection:function(a,b,c){var d=f.createRange();d.setStart(a,b),d.setEnd(a,c),f.getSelection().setSingleRange(d)},setSelectionBeforeElement:function(a){var b=f.createRange();b.selectNode(a),b.collapse(!0),f.getSelection().setSingleRange(b)},setSelectionAfterElement:function(a){var b=f.createRange();b.selectNode(a),b.collapse(!1),f.getSelection().setSingleRange(b)},setSelectionToElementStart:function(a){var b=f.createRange();b.selectNodeContents(a),b.collapse(!0),f.getSelection().setSingleRange(b)},setSelectionToElementEnd:function(a){var b=f.createRange();b.selectNodeContents(a),b.collapse(!1),a.childNodes&&a.childNodes[a.childNodes.length-1]&&"br"===a.childNodes[a.childNodes.length-1].nodeName&&(b.startOffset=b.endOffset=b.startOffset-1),f.getSelection().setSingleRange(b)},insertHtml:function(a,b){var h,j,k,l,m,n,o,p=angular.element("<div>"+a+"</div>"),q=f.getSelection().getRangeAt(0),r=d.createDocumentFragment(),s=p[0].childNodes,t=!0;if(s.length>0){for(l=[],k=0;k<s.length;k++)"p"===s[k].nodeName.toLowerCase()&&""===s[k].innerHTML.trim()||3===s[k].nodeType&&""===s[k].nodeValue.trim()||(t=t&&!e.test(s[k].nodeName),l.push(s[k]));for(var u=0;u<l.length;u++)n=r.appendChild(l[u]);!t&&q.collapsed&&/^(|<br(|\/)>)$/i.test(q.startContainer.innerHTML)&&q.selectNode(q.startContainer)}else t=!0,n=r=d.createTextNode(a);if(t)q.deleteContents();else if(q.collapsed&&q.startContainer!==b)if(q.startContainer.innerHTML&&q.startContainer.innerHTML.match(/^<[^>]*>$/i))h=q.startContainer,1===q.startOffset?(q.setStartAfter(h),q.setEndAfter(h)):(q.setStartBefore(h),q.setEndBefore(h));else{if(3===q.startContainer.nodeType&&q.startContainer.parentNode!==b)for(h=q.startContainer.parentNode,j=h.cloneNode(),c.splitNodes(h.childNodes,h,j,q.startContainer,q.startOffset);!g.test(h.nodeName);){angular.element(h).after(j),h=h.parentNode;var v=j;j=h.cloneNode(),c.splitNodes(h.childNodes,h,j,v)}else h=q.startContainer,j=h.cloneNode(),c.splitNodes(h.childNodes,h,j,void 0,void 0,q.startOffset);if(angular.element(h).after(j),q.setStartAfter(h),q.setEndAfter(h),/^(|<br(|\/)>)$/i.test(h.innerHTML.trim())&&(q.setStartBefore(h),q.setEndBefore(h),angular.element(h).remove()),/^(|<br(|\/)>)$/i.test(j.innerHTML.trim())&&angular.element(j).remove(),"li"===h.nodeName.toLowerCase()){for(o=d.createDocumentFragment(),m=0;m<r.childNodes.length;m++)p=angular.element("<li>"),c.transferChildNodes(r.childNodes[m],p[0]),c.transferNodeAttributes(r.childNodes[m],p[0]),o.appendChild(p[0]);r=o,n&&(n=r.childNodes[r.childNodes.length-1],n=n.childNodes[n.childNodes.length-1])}}else q.deleteContents();q.insertNode(r),n&&i.setSelectionToElementEnd(n)}};return i}]).service("taDOM",function(){var a={getByAttribute:function(b,c){var d=[],e=b.children();return e.length&&angular.forEach(e,function(b){d=d.concat(a.getByAttribute(angular.element(b),c))}),void 0!==b.attr(c)&&d.push(b),d},transferChildNodes:function(a,b){for(b.innerHTML="";a.childNodes.length>0;)b.appendChild(a.childNodes[0]);return b},splitNodes:function(b,c,d,e,f,g){if(!e&&isNaN(g))throw new Error("taDOM.splitNodes requires a splitNode or splitIndex");for(var h=document.createDocumentFragment(),i=document.createDocumentFragment(),j=0;b.length>0&&(isNaN(g)||g!==j)&&b[0]!==e;)h.appendChild(b[0]),j++;for(!isNaN(f)&&f>=0&&b[0]&&(h.appendChild(document.createTextNode(b[0].nodeValue.substring(0,f))),b[0].nodeValue=b[0].nodeValue.substring(f));b.length>0;)i.appendChild(b[0]);a.transferChildNodes(h,c),a.transferChildNodes(i,d)},transferNodeAttributes:function(a,b){for(var c=0;c<a.attributes.length;c++)b.setAttribute(a.attributes[c].name,a.attributes[c].value);return b}};return a}),angular.module("textAngular.validators",[]).directive("taMaxText",function(){return{restrict:"A",require:"ngModel",link:function(a,b,c,d){function e(a){var b=angular.element("<div/>");b.html(a);var c=b.text().length;return f>=c?(d.$setValidity("taMaxText",!0),a):void d.$setValidity("taMaxText",!1)}var f=parseInt(a.$eval(c.taMaxText));if(isNaN(f))throw"Max text must be an integer";c.$observe("taMaxText",function(a){if(f=parseInt(a),isNaN(f))throw"Max text must be an integer";d.$dirty&&d.$setViewValue(d.$viewValue)}),d.$parsers.unshift(e)}}}).directive("taMinText",function(){return{restrict:"A",require:"ngModel",link:function(a,b,c,d){function e(a){var b=angular.element("<div/>");b.html(a);var c=b.text().length;return!c||c>=f?(d.$setValidity("taMinText",!0),a):void d.$setValidity("taMinText",!1)}var f=parseInt(a.$eval(c.taMinText));if(isNaN(f))throw"Min text must be an integer";c.$observe("taMinText",function(a){if(f=parseInt(a),isNaN(f))throw"Min text must be an integer";d.$dirty&&d.$setViewValue(d.$viewValue)}),d.$parsers.unshift(e)}}}),angular.module("textAngular.taBind",["textAngular.factories","textAngular.DOM"]).service("_taBlankTest",[function(){var a=/<(a|abbr|acronym|bdi|bdo|big|cite|code|del|dfn|img|ins|kbd|label|map|mark|q|ruby|rp|rt|s|samp|time|tt|var)[^>]*(>|$)/i;return function(b){return function(c){if(!c)return!0;var d,e=/(^[^<]|>)[^<]/i.exec(c);return e?d=e.index:(c=c.toString().replace(/="[^"]*"/i,"").replace(/="[^"]*"/i,"").replace(/="[^"]*"/i,"").replace(/="[^"]*"/i,""),d=c.indexOf(">")),c=c.trim().substring(d,d+100),/^[^<>]+$/i.test(c)?!1:0===c.length||c===b||/^>(\s|&nbsp;)*<\/[^>]+>$/gi.test(c)?!0:/>\s*[^\s<]/i.test(c)||a.test(c)?!1:!0}}}]).directive("taBind",["taSanitize","$timeout","$window","$document","taFixChrome","taBrowserTag","taSelection","taSelectableElements","taApplyCustomRenderers","taOptions","_taBlankTest","$parse","taDOM",function(a,b,e,f,h,k,l,m,n,p,q,r,s){return{require:"ngModel",link:function(k,t,u,v){var w,x,y,z,A=void 0!==t.attr("contenteditable")&&t.attr("contenteditable"),B=A||"textarea"===t[0].tagName.toLowerCase()||"input"===t[0].tagName.toLowerCase(),C=!1,D=!1,E=!1,F=u.taUnsafeSanitizer||p.disableSanitizer,G=/^(9|19|20|27|33|34|35|36|37|38|39|40|45|112|113|114|115|116|117|118|119|120|121|122|123|144|145)$/i,H=/^(8|13|32|46|59|61|107|109|186|187|188|189|190|191|192|219|220|221|222)$/i;void 0===u.taDefaultWrap&&(u.taDefaultWrap="p"),""===u.taDefaultWrap?(y="",z=void 0===c.ie?"<div><br></div>":c.ie>=11?"<p><br></p>":c.ie<=8?"<P>&nbsp;</P>":"<p>&nbsp;</p>"):(y=void 0===c.ie||c.ie>=11?"<"+u.taDefaultWrap+"><br></"+u.taDefaultWrap+">":c.ie<=8?"<"+u.taDefaultWrap.toUpperCase()+"></"+u.taDefaultWrap.toUpperCase()+">":"<"+u.taDefaultWrap+"></"+u.taDefaultWrap+">",z=void 0===c.ie||c.ie>=11?"<"+u.taDefaultWrap+"><br></"+u.taDefaultWrap+">":c.ie<=8?"<"+u.taDefaultWrap.toUpperCase()+">&nbsp;</"+u.taDefaultWrap.toUpperCase()+">":"<"+u.taDefaultWrap+">&nbsp;</"+u.taDefaultWrap+">");var I=q(z);u.taPaste&&(x=r(u.taPaste)),t.addClass("ta-bind");var J;k["$undoManager"+(u.id||"")]=v.$undoManager={_stack:[],_index:0,_max:1e3,push:function(a){return"undefined"==typeof a||null===a||"undefined"!=typeof this.current()&&null!==this.current()&&a===this.current()?a:(this._index<this._stack.length-1&&(this._stack=this._stack.slice(0,this._index+1)),this._stack.push(a),J&&b.cancel(J),this._stack.length>this._max&&this._stack.shift(),this._index=this._stack.length-1,a)},undo:function(){return this.setToIndex(this._index-1)},redo:function(){return this.setToIndex(this._index+1)},setToIndex:function(a){return 0>a||a>this._stack.length-1?void 0:(this._index=a,this.current())},current:function(){return this._stack[this._index]}};var K=k["$undoTaBind"+(u.id||"")]=function(){if(!C&&A){var a=v.$undoManager.undo();"undefined"!=typeof a&&null!==a&&(Y(a),N(a,!1),l.setSelectionToElementEnd(t[0].childNodes.length?t[0].childNodes[t[0].childNodes.length-1]:t[0]))}},L=k["$redoTaBind"+(u.id||"")]=function(){if(!C&&A){var a=v.$undoManager.redo();"undefined"!=typeof a&&null!==a&&(Y(a),N(a,!1),l.setSelectionToElementEnd(t[0].childNodes.length?t[0].childNodes[t[0].childNodes.length-1]:t[0]))}},M=function(){if(A)return t[0].innerHTML;if(B)return t.val();throw"textAngular Error: attempting to update non-editable taBind"},N=function(a,b){E=!0,("undefined"==typeof b||null===b)&&(b=!0&&A),("undefined"==typeof a||null===a)&&(a=M()),I(a)?(""!==v.$viewValue&&v.$setViewValue(""),b&&""!==v.$undoManager.current()&&v.$undoManager.push("")):(X(),v.$viewValue!==a&&(v.$setViewValue(a),b&&v.$undoManager.push(a)))};if(k["updateTaBind"+(u.id||"")]=function(){C||N()},B)if(k.events={},A){var O=!1,P=function(c){if(c&&c.trim().length){if(c.match(/class=["']*Mso(Normal|List)/i)){var d=c.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i);d=d?d[1]:c,d=d.replace(/<o:p>[\s\S]*?<\/o:p>/gi,"").replace(/class=(["']|)MsoNormal(["']|)/gi,"");var e=angular.element("<div>"+d+"</div>"),f=angular.element("<div></div>"),g={element:null,lastIndent:[],lastLi:null,isUl:!1};g.lastIndent.peek=function(){var a=this.length;return a>0?this[a-1]:void 0};for(var h=function(a){g.isUl=a,g.element=angular.element(a?"<ul>":"<ol>"),g.lastIndent=[],g.lastIndent.peek=function(){var a=this.length;return a>0?this[a-1]:void 0},g.lastLevelMatch=null},i=0;i<=e[0].childNodes.length;i++)if(e[0].childNodes[i]&&"#text"!==e[0].childNodes[i].nodeName&&"p"===e[0].childNodes[i].tagName.toLowerCase()){var j=angular.element(e[0].childNodes[i]),m=(j.attr("class")||"").match(/MsoList(Bullet|Number|Paragraph)(CxSp(First|Middle|Last)|)/i);if(m){if(j[0].childNodes.length<2||j[0].childNodes[1].childNodes.length<1)continue;var n="bullet"===m[1].toLowerCase()||"number"!==m[1].toLowerCase()&&!(/^[^0-9a-z<]*[0-9a-z]+[^0-9a-z<>]</i.test(j[0].childNodes[1].innerHTML)||/^[^0-9a-z<]*[0-9a-z]+[^0-9a-z<>]</i.test(j[0].childNodes[1].childNodes[0].innerHTML)),o=(j.attr("style")||"").match(/margin-left:([\-\.0-9]*)/i),p=parseFloat(o?o[1]:0),q=(j.attr("style")||"").match(/mso-list:l([0-9]+) level([0-9]+) lfo[0-9+]($|;)/i);if(q&&q[2]&&(p=parseInt(q[2])),q&&(!g.lastLevelMatch||q[1]!==g.lastLevelMatch[1])||!m[3]||"first"===m[3].toLowerCase()||null===g.lastIndent.peek()||g.isUl!==n&&g.lastIndent.peek()===p)h(n),f.append(g.element);else if(null!=g.lastIndent.peek()&&g.lastIndent.peek()<p)g.element=angular.element(n?"<ul>":"<ol>"),g.lastLi.append(g.element);else if(null!=g.lastIndent.peek()&&g.lastIndent.peek()>p){for(;null!=g.lastIndent.peek()&&g.lastIndent.peek()>p;)if("li"!==g.element.parent()[0].tagName.toLowerCase()){if(!/[uo]l/i.test(g.element.parent()[0].tagName.toLowerCase()))break;g.element=g.element.parent(),g.lastIndent.pop()}else g.element=g.element.parent();g.isUl="ul"===g.element[0].tagName.toLowerCase(),n!==g.isUl&&(h(n),f.append(g.element))}g.lastLevelMatch=q,p!==g.lastIndent.peek()&&g.lastIndent.push(p),g.lastLi=angular.element("<li>"),g.element.append(g.lastLi),g.lastLi.html(j.html().replace(/<!(--|)\[if !supportLists\](--|)>[\s\S]*?<!(--|)\[endif\](--|)>/gi,"")),j.remove()}else h(!1),f.append(j)}var r=function(a){a=angular.element(a);for(var b=a[0].childNodes.length-1;b>=0;b--)a.after(a[0].childNodes[b]);a.remove()};angular.forEach(f.find("span"),function(a){a.removeAttribute("lang"),a.attributes.length<=0&&r(a)}),angular.forEach(f.find("font"),r),c=f.html()}else{if(c=c.replace(/<(|\/)meta[^>]*?>/gi,""),c.match(/<[^>]*?(ta-bind)[^>]*?>/)){if(c.match(/<[^>]*?(text-angular)[^>]*?>/)){var u=angular.element("<div>"+c+"</div>");u.find("textarea").remove();for(var w=s.getByAttribute(u,"ta-bind"),y=0;y<w.length;y++){for(var z=w[y][0].parentNode.parentNode,A=0;A<w[y][0].childNodes.length;A++)z.parentNode.insertBefore(w[y][0].childNodes[A],z);z.parentNode.removeChild(z)}c=u.html().replace('<br class="Apple-interchange-newline">',"")}}else c.match(/^<span/)&&(c=c.replace(/<(|\/)span[^>]*?>/gi,""));c=c.replace(/<br class="Apple-interchange-newline"[^>]*?>/gi,"").replace(/<span class="Apple-converted-space">( |&nbsp;)<\/span>/gi,"&nbsp;")}c=a(c,"",F),x&&(c=x(k,{$html:c})||c),l.insertHtml(c,t[0]),b(function(){v.$setViewValue(M()),O=!1,t.removeClass("processing-paste")},0)}else O=!1,t.removeClass("processing-paste")};if(t.on("paste",k.events.paste=function(a,c){if(c&&angular.extend(a,c),C||O)return a.stopPropagation(),a.preventDefault(),!1;O=!0,t.addClass("processing-paste");var d,g=(a.originalEvent||a).clipboardData;if(g&&g.getData){for(var h="",i=0;i<g.types.length;i++)h+=" "+g.types[i];return/text\/html/i.test(h)?d=g.getData("text/html"):/text\/plain/i.test(h)&&(d=g.getData("text/plain")),P(d),a.stopPropagation(),a.preventDefault(),!1}var j=e.rangy.saveSelection(),k=angular.element('<div class="ta-hidden-input" contenteditable="true"></div>');f.find("body").append(k),k[0].focus(),b(function(){e.rangy.restoreSelection(j),P(k[0].innerHTML),k.remove(),t[0].focus()},0)}),t.on("cut",k.events.cut=function(a){C?a.preventDefault():b(function(){v.$setViewValue(M())},0)}),t.on("keydown",k.events.keydown=function(a,b){if(b&&angular.extend(a,b),!C)if(!a.altKey&&a.metaKey||a.ctrlKey)90!==a.keyCode||a.shiftKey?(90===a.keyCode&&a.shiftKey||89===a.keyCode&&!a.shiftKey)&&(L(),a.preventDefault()):(K(),a.preventDefault());else if(13===a.keyCode&&!a.shiftKey){var c=l.getSelectionElement();if(!c.tagName.match(g))return;var d=angular.element(y);if(/^<br(|\/)>$/i.test(c.innerHTML.trim())&&"blockquote"===c.parentNode.tagName.toLowerCase()&&!c.nextSibling){$selection=angular.element(c);var e=$selection.parent();e.after(d),$selection.remove(),0===e.children().length&&e.remove(),l.setSelectionToElementStart(d[0]),a.preventDefault()}else/^<[^>]+><br(|\/)><\/[^>]+>$/i.test(c.innerHTML.trim())&&"blockquote"===c.tagName.toLowerCase()&&($selection=angular.element(c),$selection.after(d),$selection.remove(),l.setSelectionToElementStart(d[0]),a.preventDefault())}}),t.on("keyup",k.events.keyup=function(a,c){if(c&&angular.extend(a,c),J&&b.cancel(J),!C&&!G.test(a.keyCode)){if(""!==y&&13===a.keyCode&&!a.shiftKey){for(var d=l.getSelectionElement();!d.tagName.match(g)&&d!==t[0];)d=d.parentNode;if(d.tagName.toLowerCase()!==u.taDefaultWrap&&"li"!==d.tagName.toLowerCase()&&(""===d.innerHTML.trim()||"<br>"===d.innerHTML.trim())){var f=angular.element(y);angular.element(d).replaceWith(f),l.setSelectionToElementStart(f[0])}}var h=M();if(""!==y&&""===h.trim())Y(y),l.setSelectionToElementStart(t.children()[0]);else if("<"!==h.substring(0,1)&&""!==u.taDefaultWrap){var i=e.rangy.saveSelection();h=M(),h="<"+u.taDefaultWrap+">"+h+"</"+u.taDefaultWrap+">",Y(h),e.rangy.restoreSelection(i)}var j=w!==a.keyCode&&H.test(a.keyCode);N(h,j),j||(J=b(function(){v.$undoManager.push(h)},250)),w=a.keyCode}}),t.on("blur",k.events.blur=function(){D=!1,C||N(),E=!0,v.$render()}),u.placeholder&&(c.ie>8||void 0===c.ie)){var Q;if(!u.id)throw"textAngular Error: An unique ID is required for placeholders to work";Q=i("#"+u.id+".placeholder-text:before",'content: "'+u.placeholder+'"'),k.$on("$destroy",function(){j(Q)})}t.on("focus",k.events.focus=function(){D=!0,t.removeClass("placeholder-text")}),t.on("mouseup",k.events.mouseup=function(){var a=l.getSelection();a.start.element===t[0]&&t.children().length&&l.setSelectionToElementStart(t.children()[0])}),t.on("mousedown",k.events.mousedown=function(a,b){b&&angular.extend(a,b),a.stopPropagation()})}else{t.on("change blur",k.events.change=k.events.blur=function(){C||v.$setViewValue(M())}),t.on("keydown",k.events.keydown=function(a,b){if(b&&angular.extend(a,b),9===a.keyCode){var c=this.selectionStart,d=this.selectionEnd,e=t.val();if(a.shiftKey){var f=e.lastIndexOf("\n",c),g=e.lastIndexOf("	",c);-1!==g&&g>=f&&(t.val(e.substring(0,g)+e.substring(g+1)),this.selectionStart=this.selectionEnd=c-1)}else t.val(e.substring(0,c)+"	"+e.substring(d)),this.selectionStart=this.selectionEnd=c+1;a.preventDefault()}});var R=function(a,b){for(var c="",d=0;b>d;d++)c+=a;return c},S=function(a,b){var c="",d=a.childNodes;b++,c+=R("	",b-1)+a.outerHTML.substring(0,a.outerHTML.indexOf("<li"));for(var e=0;e<d.length;e++)d[e].outerHTML&&(c+="ul"===d[e].nodeName.toLowerCase()||"ol"===d[e].nodeName.toLowerCase()?"\n"+S(d[e],b):"\n"+R("	",b)+d[e].outerHTML);return c+="\n"+R("	",b-1)+a.outerHTML.substring(a.outerHTML.lastIndexOf("<"))};v.$formatters.push(function(a){var b=angular.element("<div>"+a+"</div>")[0].childNodes;if(b.length>0){a="";for(var c=0;c<b.length;c++)b[c].outerHTML&&(a.length>0&&(a+="\n"),a+="ul"===b[c].nodeName.toLowerCase()||"ol"===b[c].nodeName.toLowerCase()?""+S(b[c],0):""+b[c].outerHTML)}return a})}var T=function(b){return v.$oldViewValue=a(h(b),v.$oldViewValue,F)},U=function(a){return u.required&&v.$setValidity("required",!I(a)),a};v.$parsers.push(T),v.$parsers.push(U),v.$formatters.push(T),v.$formatters.push(function(a){if(I(a))return a;var b=angular.element("<div>"+a+"</div>");return 0===b.children().length&&(a="<"+u.taDefaultWrap+">"+a+"</"+u.taDefaultWrap+">"),a}),v.$formatters.push(U),v.$formatters.push(function(a){return v.$undoManager.push(a||"")});var V=function(a){return k.$emit("ta-element-select",this),a.preventDefault(),!1},W=function(a,c){if(c&&angular.extend(a,c),!o&&!C){o=!0;var d;d=a.originalEvent?a.originalEvent.dataTransfer:a.dataTransfer,k.$emit("ta-drop-event",this,a,d),b(function(){o=!1,N()},100)}},X=k["reApplyOnSelectorHandlers"+(u.id||"")]=function(){C||angular.forEach(m,function(a){t.find(a).off("click",V).on("click",V)})},Y=function(a){t[0].innerHTML=a};v.$render=function(){var a=v.$viewValue||"";E||(A&&D&&(t.removeClass("placeholder-text"),t[0].blur(),b(function(){t[0].focus(),l.setSelectionToElementEnd(t.children()[t.children().length-1])},1)),A?(Y(u.placeholder?""===a?y:a:""===a?y:a),C?t.off("drop",W):(X(),t.on("drop",W))):"textarea"!==t[0].tagName.toLowerCase()&&"input"!==t[0].tagName.toLowerCase()?Y(n(a)):t.val(a)),A&&u.placeholder&&(""===a?D?t.removeClass("placeholder-text"):t.addClass("placeholder-text"):t.removeClass("placeholder-text")),E=!1},u.taReadonly&&(C=k.$eval(u.taReadonly),C?(t.addClass("ta-readonly"),("textarea"===t[0].tagName.toLowerCase()||"input"===t[0].tagName.toLowerCase())&&t.attr("disabled","disabled"),void 0!==t.attr("contenteditable")&&t.attr("contenteditable")&&t.removeAttr("contenteditable")):(t.removeClass("ta-readonly"),"textarea"===t[0].tagName.toLowerCase()||"input"===t[0].tagName.toLowerCase()?t.removeAttr("disabled"):A&&t.attr("contenteditable","true")),k.$watch(u.taReadonly,function(a,b){b!==a&&(a?(t.addClass("ta-readonly"),("textarea"===t[0].tagName.toLowerCase()||"input"===t[0].tagName.toLowerCase())&&t.attr("disabled","disabled"),void 0!==t.attr("contenteditable")&&t.attr("contenteditable")&&t.removeAttr("contenteditable"),angular.forEach(m,function(a){t.find(a).on("click",V)}),t.off("drop",W)):(t.removeClass("ta-readonly"),"textarea"===t[0].tagName.toLowerCase()||"input"===t[0].tagName.toLowerCase()?t.removeAttr("disabled"):A&&t.attr("contenteditable","true"),angular.forEach(m,function(a){t.find(a).off("click",V)}),t.on("drop",W)),C=a)})),A&&!C&&(angular.forEach(m,function(a){t.find(a).on("click",V)}),t.on("drop",W),t.on("blur",function(){c.webkit&&(d=!0)}))}}}]);var o=!1,p=angular.module("textAngular",["ngSanitize","textAngularSetup","textAngular.factories","textAngular.DOM","textAngular.validators","textAngular.taBind"]),q={};p.constant("taRegisterTool",b),p.value("taTools",q),p.config([function(){angular.forEach(q,function(a,b){delete q[b]})}]),p.run([function(){if(!window.rangy)throw"rangy-core.js and rangy-selectionsaverestore.js are required for textAngular to work correctly, rangy-core is not yet loaded.";if(window.rangy.init(),!window.rangy.saveSelection)throw"rangy-selectionsaverestore.js is required for textAngular to work correctly."}]),p.directive("textAngular",["$compile","$timeout","taOptions","taSelection","taExecCommand","textAngularManager","$window","$document","$animate","$log","$q","$parse",function(a,b,c,d,e,f,g,h,i,j,k,l){return{require:"?ngModel",scope:{},restrict:"EA",link:function(m,n,o,p){var q,r,s,t,u,v,w,x,y,z,A=o.serial?o.serial:Math.floor(1e16*Math.random());m._name=o.name?o.name:"textAngularEditor"+A;var B=function(a,c,d){b(function(){var b=function(){a.off(c,b),d.apply(this,arguments)};a.on(c,b)},100)};y=e(o.taDefaultWrap),angular.extend(m,angular.copy(c),{wrapSelection:function(a,b,c){"undo"===a.toLowerCase()?m["$undoTaBindtaTextElement"+A]():"redo"===a.toLowerCase()?m["$redoTaBindtaTextElement"+A]():(y(a,!1,b),c&&m["reApplyOnSelectorHandlerstaTextElement"+A](),m.displayElements.text[0].focus())},showHtml:m.$eval(o.taShowHtml)||!1}),o.taFocussedClass&&(m.classes.focussed=o.taFocussedClass),o.taTextEditorClass&&(m.classes.textEditor=o.taTextEditorClass),o.taHtmlEditorClass&&(m.classes.htmlEditor=o.taHtmlEditorClass),o.taTextEditorSetup&&(m.setup.textEditorSetup=m.$parent.$eval(o.taTextEditorSetup)),o.taHtmlEditorSetup&&(m.setup.htmlEditorSetup=m.$parent.$eval(o.taHtmlEditorSetup)),m.fileDropHandler=o.taFileDrop?m.$parent.$eval(o.taFileDrop):m.defaultFileDropHandler,w=n[0].innerHTML,n[0].innerHTML="",m.displayElements={forminput:angular.element("<input type='hidden' tabindex='-1' style='display: none;'>"),html:angular.element("<textarea></textarea>"),text:angular.element("<div></div>"),scrollWindow:angular.element("<div class='ta-scroll-window'></div>"),popover:angular.element('<div class="popover fade bottom" style="max-width: none; width: 305px;"></div>'),popoverArrow:angular.element('<div class="arrow"></div>'),popoverContainer:angular.element('<div class="popover-content"></div>'),resize:{overlay:angular.element('<div class="ta-resizer-handle-overlay"></div>'),background:angular.element('<div class="ta-resizer-handle-background"></div>'),anchors:[angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-tl"></div>'),angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-tr"></div>'),angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-bl"></div>'),angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-br"></div>')],info:angular.element('<div class="ta-resizer-handle-info"></div>')}},m.displayElements.popover.append(m.displayElements.popoverArrow),m.displayElements.popover.append(m.displayElements.popoverContainer),m.displayElements.scrollWindow.append(m.displayElements.popover),m.displayElements.popover.on("mousedown",function(a,b){return b&&angular.extend(a,b),a.preventDefault(),!1
        }),m.showPopover=function(a){m.displayElements.popover.css("display","block"),m.reflowPopover(a),i.addClass(m.displayElements.popover,"in"),B(h.find("body"),"click keyup",function(){m.hidePopover()})},m.reflowPopover=function(a){m.displayElements.text[0].offsetHeight-51>a[0].offsetTop?(m.displayElements.popover.css("top",a[0].offsetTop+a[0].offsetHeight+"px"),m.displayElements.popover.removeClass("top").addClass("bottom")):(m.displayElements.popover.css("top",a[0].offsetTop-54+"px"),m.displayElements.popover.removeClass("bottom").addClass("top"));var b=m.displayElements.text[0].offsetWidth-m.displayElements.popover[0].offsetWidth,c=a[0].offsetLeft+a[0].offsetWidth/2-m.displayElements.popover[0].offsetWidth/2;m.displayElements.popover.css("left",Math.max(0,Math.min(b,c))+"px"),m.displayElements.popoverArrow.css("margin-left",Math.min(c,Math.max(0,c-b))-11+"px")},m.hidePopover=function(){var a=function(){m.displayElements.popover.css("display",""),m.displayElements.popoverContainer.attr("style",""),m.displayElements.popoverContainer.attr("class","popover-content")};k.when(i.removeClass(m.displayElements.popover,"in",a)).then(a)},m.displayElements.resize.overlay.append(m.displayElements.resize.background),angular.forEach(m.displayElements.resize.anchors,function(a){m.displayElements.resize.overlay.append(a)}),m.displayElements.resize.overlay.append(m.displayElements.resize.info),m.displayElements.scrollWindow.append(m.displayElements.resize.overlay),m.reflowResizeOverlay=function(a){a=angular.element(a)[0],m.displayElements.resize.overlay.css({display:"block",left:a.offsetLeft-5+"px",top:a.offsetTop-5+"px",width:a.offsetWidth+10+"px",height:a.offsetHeight+10+"px"}),m.displayElements.resize.info.text(a.offsetWidth+" x "+a.offsetHeight)},m.showResizeOverlay=function(a){var b=h.find("body");z=function(c){var d={width:parseInt(a.attr("width")),height:parseInt(a.attr("height")),x:c.clientX,y:c.clientY};(void 0===d.width||isNaN(d.width))&&(d.width=a[0].offsetWidth),(void 0===d.height||isNaN(d.height))&&(d.height=a[0].offsetHeight),m.hidePopover();var e=d.height/d.width,f=function(b){var c={x:Math.max(0,d.width+(b.clientX-d.x)),y:Math.max(0,d.height+(b.clientY-d.y))};if(b.shiftKey){var f=c.y/c.x;c.x=e>f?c.x:c.y/e,c.y=e>f?c.x*e:c.y}el=angular.element(a),el.attr("height",Math.max(0,c.y)),el.attr("width",Math.max(0,c.x)),m.reflowResizeOverlay(a)};b.on("mousemove",f),B(b,"mouseup",function(c){c.preventDefault(),c.stopPropagation(),b.off("mousemove",f),m.showPopover(a)}),c.stopPropagation(),c.preventDefault()},m.displayElements.resize.anchors[3].on("mousedown",z),m.reflowResizeOverlay(a),B(b,"click",function(){m.hideResizeOverlay()})},m.hideResizeOverlay=function(){m.displayElements.resize.anchors[3].off("mousedown",z),m.displayElements.resize.overlay.css("display","")},m.setup.htmlEditorSetup(m.displayElements.html),m.setup.textEditorSetup(m.displayElements.text),m.displayElements.html.attr({id:"taHtmlElement"+A,"ng-show":"showHtml","ta-bind":"ta-bind","ng-model":"html"}),m.displayElements.text.attr({id:"taTextElement"+A,contentEditable:"true","ta-bind":"ta-bind","ng-model":"html"}),m.displayElements.scrollWindow.attr({"ng-hide":"showHtml"}),o.taDefaultWrap&&m.displayElements.text.attr("ta-default-wrap",o.taDefaultWrap),o.taUnsafeSanitizer&&(m.displayElements.text.attr("ta-unsafe-sanitizer",o.taUnsafeSanitizer),m.displayElements.html.attr("ta-unsafe-sanitizer",o.taUnsafeSanitizer)),m.displayElements.scrollWindow.append(m.displayElements.text),n.append(m.displayElements.scrollWindow),n.append(m.displayElements.html),m.displayElements.forminput.attr("name",m._name),n.append(m.displayElements.forminput),o.tabindex&&(n.removeAttr("tabindex"),m.displayElements.text.attr("tabindex",o.tabindex),m.displayElements.html.attr("tabindex",o.tabindex)),o.placeholder&&(m.displayElements.text.attr("placeholder",o.placeholder),m.displayElements.html.attr("placeholder",o.placeholder)),o.taDisabled&&(m.displayElements.text.attr("ta-readonly","disabled"),m.displayElements.html.attr("ta-readonly","disabled"),m.disabled=m.$parent.$eval(o.taDisabled),m.$parent.$watch(o.taDisabled,function(a){m.disabled=a,m.disabled?n.addClass(m.classes.disabled):n.removeClass(m.classes.disabled)})),o.taPaste&&(m._pasteHandler=function(a){return l(o.taPaste)(m.$parent,{$html:a})},m.displayElements.text.attr("ta-paste","_pasteHandler($html)")),a(m.displayElements.scrollWindow)(m),a(m.displayElements.html)(m),m.updateTaBindtaTextElement=m["updateTaBindtaTextElement"+A],m.updateTaBindtaHtmlElement=m["updateTaBindtaHtmlElement"+A],n.addClass("ta-root"),m.displayElements.scrollWindow.addClass("ta-text ta-editor "+m.classes.textEditor),m.displayElements.html.addClass("ta-html ta-editor "+m.classes.htmlEditor),m._actionRunning=!1;var C=!1;if(m.startAction=function(){return m._actionRunning=!0,C=g.rangy.saveSelection(),function(){C&&g.rangy.restoreSelection(C)}},m.endAction=function(){m._actionRunning=!1,C&&g.rangy.removeMarkers(C),C=!1,m.updateSelectedStyles(),m.showHtml||m["updateTaBindtaTextElement"+A]()},u=function(){m.focussed=!0,n.addClass(m.classes.focussed),x.focus(),n.triggerHandler("focus")},m.displayElements.html.on("focus",u),m.displayElements.text.on("focus",u),v=function(a){return m._actionRunning||h[0].activeElement===m.displayElements.html[0]||h[0].activeElement===m.displayElements.text[0]||(n.removeClass(m.classes.focussed),x.unfocus(),b(function(){m._bUpdateSelectedStyles=!1,n.triggerHandler("blur"),m.focussed=!1},0)),a.preventDefault(),!1},m.displayElements.html.on("blur",v),m.displayElements.text.on("blur",v),m.displayElements.text.on("paste",function(a){n.triggerHandler("paste",a)}),m.queryFormatBlockState=function(a){return!m.showHtml&&a.toLowerCase()===h[0].queryCommandValue("formatBlock").toLowerCase()},m.queryCommandState=function(a){return m.showHtml?"":h[0].queryCommandState(a)},m.switchView=function(){m.showHtml=!m.showHtml,i.enabled(!1,m.displayElements.html),i.enabled(!1,m.displayElements.text),m.showHtml?b(function(){return i.enabled(!0,m.displayElements.html),i.enabled(!0,m.displayElements.text),m.displayElements.html[0].focus()},100):b(function(){return i.enabled(!0,m.displayElements.html),i.enabled(!0,m.displayElements.text),m.displayElements.text[0].focus()},100)},o.ngModel){var D=!0;p.$render=function(){if(D){D=!1;var a=m.$parent.$eval(o.ngModel);void 0!==a&&null!==a||!w||""===w||p.$setViewValue(w)}m.displayElements.forminput.val(p.$viewValue),m._elementSelectTriggered||(m.html=p.$viewValue||"")};var E=function(a){return o.required&&p.$setValidity("required",!(!a||""===a.trim())),a};p.$parsers.push(E),p.$formatters.push(E)}else m.displayElements.forminput.val(w),m.html=w;if(m.$watch("html",function(a,b){a!==b&&(o.ngModel&&p.$viewValue!==a&&p.$setViewValue(a),m.displayElements.forminput.val(a))}),o.taTargetToolbars)x=f.registerEditor(m._name,m,o.taTargetToolbars.split(","));else{var F=angular.element('<div text-angular-toolbar name="textAngularToolbar'+A+'">');o.taToolbar&&F.attr("ta-toolbar",o.taToolbar),o.taToolbarClass&&F.attr("ta-toolbar-class",o.taToolbarClass),o.taToolbarGroupClass&&F.attr("ta-toolbar-group-class",o.taToolbarGroupClass),o.taToolbarButtonClass&&F.attr("ta-toolbar-button-class",o.taToolbarButtonClass),o.taToolbarActiveButtonClass&&F.attr("ta-toolbar-active-button-class",o.taToolbarActiveButtonClass),o.taFocussedClass&&F.attr("ta-focussed-class",o.taFocussedClass),n.prepend(F),a(F)(m.$parent),x=f.registerEditor(m._name,m,["textAngularToolbar"+A])}m.$on("$destroy",function(){f.unregisterEditor(m._name)}),m.$on("ta-element-select",function(a,b){x.triggerElementSelect(a,b)&&m["reApplyOnSelectorHandlerstaTextElement"+A]()}),m.$on("ta-drop-event",function(a,c,d,e){m.displayElements.text[0].focus(),e&&e.files&&e.files.length>0?(angular.forEach(e.files,function(a){try{k.when(m.fileDropHandler(a,m.wrapSelection)||m.fileDropHandler!==m.defaultFileDropHandler&&k.when(m.defaultFileDropHandler(a,m.wrapSelection))).then(function(){m["updateTaBindtaTextElement"+A]()})}catch(b){j.error(b)}}),d.preventDefault(),d.stopPropagation()):b(function(){m["updateTaBindtaTextElement"+A]()},0)}),m._bUpdateSelectedStyles=!1,angular.element(window).on("blur",function(){m._bUpdateSelectedStyles=!1,m.focussed=!1}),m.updateSelectedStyles=function(){var a;void 0!==(a=d.getSelectionElement())&&a.parentNode!==m.displayElements.text[0]?x.updateSelectedStyles(angular.element(a)):x.updateSelectedStyles(),m._bUpdateSelectedStyles&&b(m.updateSelectedStyles,200)},q=function(){return m.focussed?void(m._bUpdateSelectedStyles||(m._bUpdateSelectedStyles=!0,m.$apply(function(){m.updateSelectedStyles()}))):void(m._bUpdateSelectedStyles=!1)},m.displayElements.html.on("keydown",q),m.displayElements.text.on("keydown",q),r=function(){m._bUpdateSelectedStyles=!1},m.displayElements.html.on("keyup",r),m.displayElements.text.on("keyup",r),s=function(a,b){b&&angular.extend(a,b),m.$apply(function(){return x.sendKeyCommand(a)?(m._bUpdateSelectedStyles||m.updateSelectedStyles(),a.preventDefault(),!1):void 0})},m.displayElements.html.on("keypress",s),m.displayElements.text.on("keypress",s),t=function(){m._bUpdateSelectedStyles=!1,m.$apply(function(){m.updateSelectedStyles()})},m.displayElements.html.on("mouseup",t),m.displayElements.text.on("mouseup",t)}}}]),p.service("textAngularManager",["taToolExecuteAction","taTools","taRegisterTool",function(a,b,c){var d={},e={};return{registerEditor:function(c,f,g){if(!c||""===c)throw"textAngular Error: An editor requires a name";if(!f)throw"textAngular Error: An editor requires a scope";if(e[c])throw'textAngular Error: An Editor with name "'+c+'" already exists';var h=[];return angular.forEach(g,function(a){d[a]&&h.push(d[a])}),e[c]={scope:f,toolbars:g,_registerToolbar:function(a){this.toolbars.indexOf(a.name)>=0&&h.push(a)},editorFunctions:{disable:function(){angular.forEach(h,function(a){a.disabled=!0})},enable:function(){angular.forEach(h,function(a){a.disabled=!1})},focus:function(){angular.forEach(h,function(a){a._parent=f,a.disabled=!1,a.focussed=!0,f.focussed=!0})},unfocus:function(){angular.forEach(h,function(a){a.disabled=!0,a.focussed=!1}),f.focussed=!1},updateSelectedStyles:function(a){angular.forEach(h,function(b){angular.forEach(b.tools,function(c){c.activeState&&(b._parent=f,c.active=c.activeState(a))})})},sendKeyCommand:function(c){var d=!1;return(c.ctrlKey||c.metaKey)&&angular.forEach(b,function(b,e){if(b.commandKeyCode&&b.commandKeyCode===c.which)for(var g=0;g<h.length;g++)if(void 0!==h[g].tools[e]){a.call(h[g].tools[e],f),d=!0;break}}),d},triggerElementSelect:function(a,c){var d=function(a,b){for(var c=!0,d=0;d<b.length;d++)c=c&&a.attr(b[d]);return c},e=[],g={},i=!1;c=angular.element(c);var j=!1;if(angular.forEach(b,function(a,b){a.onElementSelect&&a.onElementSelect.element&&a.onElementSelect.element.toLowerCase()===c[0].tagName.toLowerCase()&&(!a.onElementSelect.filter||a.onElementSelect.filter(c))&&(j=j||angular.isArray(a.onElementSelect.onlyWithAttrs)&&d(c,a.onElementSelect.onlyWithAttrs),(!a.onElementSelect.onlyWithAttrs||d(c,a.onElementSelect.onlyWithAttrs))&&(g[b]=a))}),j?(angular.forEach(g,function(a,b){a.onElementSelect.onlyWithAttrs&&d(c,a.onElementSelect.onlyWithAttrs)&&e.push({name:b,tool:a})}),e.sort(function(a,b){return b.tool.onElementSelect.onlyWithAttrs.length-a.tool.onElementSelect.onlyWithAttrs.length})):angular.forEach(g,function(a,b){e.push({name:b,tool:a})}),e.length>0)for(var k=0;k<e.length;k++){for(var l=e[k].tool,m=e[k].name,n=0;n<h.length;n++)if(void 0!==h[n].tools[m]){l.onElementSelect.action.call(h[n].tools[m],a,c,f),i=!0;break}if(i)break}return i}}},e[c].editorFunctions},retrieveEditor:function(a){return e[a]},unregisterEditor:function(a){delete e[a]},registerToolbar:function(a){if(!a)throw"textAngular Error: A toolbar requires a scope";if(!a.name||""===a.name)throw"textAngular Error: A toolbar requires a name";if(d[a.name])throw'textAngular Error: A toolbar with name "'+a.name+'" already exists';d[a.name]=a,angular.forEach(e,function(b){b._registerToolbar(a)})},retrieveToolbar:function(a){return d[a]},retrieveToolbarsViaEditor:function(a){var b=[],c=this;return angular.forEach(this.retrieveEditor(a).toolbars,function(a){b.push(c.retrieveToolbar(a))}),b},unregisterToolbar:function(a){delete d[a]},updateToolsDisplay:function(a){var b=this;angular.forEach(a,function(a,c){b.updateToolDisplay(c,a)})},resetToolsDisplay:function(){var a=this;angular.forEach(b,function(b,c){a.resetToolDisplay(c)})},updateToolDisplay:function(a,b){var c=this;angular.forEach(d,function(d,e){c.updateToolbarToolDisplay(e,a,b)})},resetToolDisplay:function(a){var b=this;angular.forEach(d,function(c,d){b.resetToolbarToolDisplay(d,a)})},updateToolbarToolDisplay:function(a,b,c){if(!d[a])throw'textAngular Error: No Toolbar with name "'+a+'" exists';d[a].updateToolDisplay(b,c)},resetToolbarToolDisplay:function(a,c){if(!d[a])throw'textAngular Error: No Toolbar with name "'+a+'" exists';d[a].updateToolDisplay(c,b[c],!0)},removeTool:function(a){delete b[a],angular.forEach(d,function(b){delete b.tools[a];for(var c=0;c<b.toolbar.length;c++){for(var d,e=0;e<b.toolbar[c].length;e++){if(b.toolbar[c][e]===a){d={group:c,index:e};break}if(void 0!==d)break}void 0!==d&&(b.toolbar[d.group].slice(d.index,1),b._$element.children().eq(d.group).children().eq(d.index).remove())}})},addTool:function(a,b,e,f){c(a,b),angular.forEach(d,function(c){c.addTool(a,b,e,f)})},addToolToToolbar:function(a,b,e,f,g){c(a,b),d[e].addTool(a,b,f,g)},refreshEditor:function(a){if(!e[a])throw'textAngular Error: No Editor with name "'+a+'" exists';e[a].scope.updateTaBindtaTextElement(),e[a].scope.$$phase||e[a].scope.$digest()}}}]),p.directive("textAngularToolbar",["$compile","textAngularManager","taOptions","taTools","taToolExecuteAction","$window",function(a,b,c,d,e,f){return{scope:{name:"@"},restrict:"EA",link:function(g,h,i){if(!g.name||""===g.name)throw"textAngular Error: A toolbar requires a name";angular.extend(g,angular.copy(c)),i.taToolbar&&(g.toolbar=g.$parent.$eval(i.taToolbar)),i.taToolbarClass&&(g.classes.toolbar=i.taToolbarClass),i.taToolbarGroupClass&&(g.classes.toolbarGroup=i.taToolbarGroupClass),i.taToolbarButtonClass&&(g.classes.toolbarButton=i.taToolbarButtonClass),i.taToolbarActiveButtonClass&&(g.classes.toolbarButtonActive=i.taToolbarActiveButtonClass),i.taFocussedClass&&(g.classes.focussed=i.taFocussedClass),g.disabled=!0,g.focussed=!1,g._$element=h,h[0].innerHTML="",h.addClass("ta-toolbar "+g.classes.toolbar),g.$watch("focussed",function(){g.focussed?h.addClass(g.classes.focussed):h.removeClass(g.classes.focussed)});var j=function(b,c){var d;if(d=angular.element(b&&b.display?b.display:"<button type='button'>"),d.addClass(b&&b["class"]?b["class"]:g.classes.toolbarButton),d.attr("name",c.name),d.attr("unselectable","on"),d.attr("ng-disabled","isDisabled()"),d.attr("tabindex","-1"),d.attr("ng-click","executeAction()"),d.attr("ng-class","displayActiveToolClass(active)"),b&&b.tooltiptext&&d.attr("title",b.tooltiptext),d.on("mousedown",function(a,b){return b&&angular.extend(a,b),a.preventDefault(),!1}),b&&!b.display&&!c._display&&(d[0].innerHTML="",b.buttontext&&(d[0].innerHTML=b.buttontext),b.iconclass)){var e=angular.element("<i>"),f=d[0].innerHTML;e.addClass(b.iconclass),d[0].innerHTML="",d.append(e),f&&""!==f&&d.append("&nbsp;"+f)}return c._lastToolDefinition=angular.copy(b),a(d)(c)};g.tools={},g._parent={disabled:!0,showHtml:!1,queryFormatBlockState:function(){return!1},queryCommandState:function(){return!1}};var k={$window:f,$editor:function(){return g._parent},isDisabled:function(){return"function"!=typeof this.$eval("disabled")&&this.$eval("disabled")||this.$eval("disabled()")||"html"!==this.name&&this.$editor().showHtml||this.$parent.disabled||this.$editor().disabled},displayActiveToolClass:function(a){return a?g.classes.toolbarButtonActive:""},executeAction:e};angular.forEach(g.toolbar,function(a){var b=angular.element("<div>");b.addClass(g.classes.toolbarGroup),angular.forEach(a,function(a){g.tools[a]=angular.extend(g.$new(!0),d[a],k,{name:a}),g.tools[a].$element=j(d[a],g.tools[a]),b.append(g.tools[a].$element)}),h.append(b)}),g.updateToolDisplay=function(a,b,c){var d=g.tools[a];if(d){if(d._lastToolDefinition&&!c&&(b=angular.extend({},d._lastToolDefinition,b)),null===b.buttontext&&null===b.iconclass&&null===b.display)throw'textAngular Error: Tool Definition for updating "'+a+'" does not have a valid display/iconclass/buttontext value';null===b.buttontext&&delete b.buttontext,null===b.iconclass&&delete b.iconclass,null===b.display&&delete b.display;var e=j(b,d);d.$element.replaceWith(e),d.$element=e}},g.addTool=function(a,b,c,e){g.tools[a]=angular.extend(g.$new(!0),d[a],k,{name:a}),g.tools[a].$element=j(d[a],g.tools[a]);var f;void 0===c&&(c=g.toolbar.length-1),f=angular.element(h.children()[c]),void 0===e?(f.append(g.tools[a].$element),g.toolbar[c][g.toolbar[c].length-1]=a):(f.children().eq(e).after(g.tools[a].$element),g.toolbar[c][e]=a)},b.registerToolbar(g),g.$on("$destroy",function(){b.unregisterToolbar(g.name)})}}}])}()}({},function(){return this}());
    /**
     * @license Rangy, a cross-browser JavaScript range and selection library
     * http://code.google.com/p/rangy/
     *
     * Copyright 2012, Tim Down
     * Licensed under the MIT license.
     * Version: 1.2.3
     * Build date: 26 February 2012
     */
    !function(a,b){
        b ? b["true"]=a: b = b,
        window.rangy=function(){function a(a,b){var c=typeof a[b];return c==l||!(c!=k||!a[b])||"unknown"==c}function b(a,b){return!(typeof a[b]!=k||!a[b])}function c(a,b){return typeof a[b]!=m}function d(a){return function(b,c){for(var d=c.length;d--;)if(!a(b,c[d]))return!1;return!0}}function e(a){return a&&r(a,q)&&t(a,p)}function f(a){window.alert("Rangy not supported in your browser. Reason: "+a),u.initialized=!0,u.supported=!1}function g(a){var b="Rangy warning: "+a;u.config.alertOnWarn?window.alert(b):typeof window.console!=m&&typeof window.console.log!=m&&window.console.log(b)}function h(){if(!u.initialized){var c,d=!1,g=!1;a(document,"createRange")&&(c=document.createRange(),r(c,o)&&t(c,n)&&(d=!0),c.detach());var h=b(document,"body")?document.body:document.getElementsByTagName("body")[0];h&&a(h,"createTextRange")&&(c=h.createTextRange(),e(c)&&(g=!0)),d||g||f("Neither Range nor TextRange are implemented"),u.initialized=!0,u.features={implementsDomRange:d,implementsTextRange:g};for(var i=w.concat(v),j=0,k=i.length;k>j;++j)try{i[j](u)}catch(l){b(window,"console")&&a(window.console,"log")&&window.console.log("Init listener threw an exception. Continuing.",l)}}}function i(a){a=a||window,h();for(var b=0,c=x.length;c>b;++b)x[b](a)}function j(a){this.name=a,this.initialized=!1,this.supported=!1}var k="object",l="function",m="undefined",n=["startContainer","startOffset","endContainer","endOffset","collapsed","commonAncestorContainer","START_TO_START","START_TO_END","END_TO_START","END_TO_END"],o=["setStart","setStartBefore","setStartAfter","setEnd","setEndBefore","setEndAfter","collapse","selectNode","selectNodeContents","compareBoundaryPoints","deleteContents","extractContents","cloneContents","insertNode","surroundContents","cloneRange","toString","detach"],p=["boundingHeight","boundingLeft","boundingTop","boundingWidth","htmlText","text"],q=["collapse","compareEndPoints","duplicate","getBookmark","moveToBookmark","moveToElementText","parentElement","pasteHTML","select","setEndPoint","getBoundingClientRect"],r=d(a),s=d(b),t=d(c),u={version:"1.2.3",initialized:!1,supported:!0,util:{isHostMethod:a,isHostObject:b,isHostProperty:c,areHostMethods:r,areHostObjects:s,areHostProperties:t,isTextRange:e},features:{},modules:{},config:{alertOnWarn:!1,preferTextRange:!1}};u.fail=f,u.warn=g,{}.hasOwnProperty?u.util.extend=function(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c])}:f("hasOwnProperty not supported");var v=[],w=[];u.init=h,u.addInitListener=function(a){u.initialized?a(u):v.push(a)};var x=[];u.addCreateMissingNativeApiListener=function(a){x.push(a)},u.createMissingNativeApi=i,j.prototype.fail=function(a){throw this.initialized=!0,this.supported=!1,new Error("Module '"+this.name+"' failed to load: "+a)},j.prototype.warn=function(a){u.warn("Module "+this.name+": "+a)},j.prototype.createError=function(a){return new Error("Error in Rangy "+this.name+" module: "+a)},u.createModule=function(a,b){var c=new j(a);u.modules[a]=c,w.push(function(a){b(a,c),c.initialized=!0,c.supported=!0})},u.requireModules=function(a){for(var b,c,d=0,e=a.length;e>d;++d){if(c=a[d],b=u.modules[c],!(b&&b instanceof j))throw new Error("Module '"+c+"' not found");if(!b.supported)throw new Error("Module '"+c+"' not supported")}};var y=!1,z=function(){y||(y=!0,u.initialized||h())};return typeof window==m?void f("No window found"):typeof document==m?void f("No document found"):(a(document,"addEventListener")&&document.addEventListener("DOMContentLoaded",z,!1),a(window,"addEventListener")?window.addEventListener("load",z,!1):a(window,"attachEvent")?window.attachEvent("onload",z):f("Window does not have required addEventListener or attachEvent method"),u)}(),rangy.createModule("DomUtil",function(a,b){function c(a){var b;return typeof a.namespaceURI==z||null===(b=a.namespaceURI)||"http://www.w3.org/1999/xhtml"==b}function d(a){var b=a.parentNode;return 1==b.nodeType?b:null}function e(a){for(var b=0;a=a.previousSibling;)b++;return b}function f(a){var b;return j(a)?a.length:(b=a.childNodes)?b.length:0}function g(a,b){var c,d=[];for(c=a;c;c=c.parentNode)d.push(c);for(c=b;c;c=c.parentNode)if(D(d,c))return c;return null}function h(a,b,c){for(var d=c?b:b.parentNode;d;){if(d===a)return!0;d=d.parentNode}return!1}function i(a,b,c){for(var d,e=c?a:a.parentNode;e;){if(d=e.parentNode,d===b)return e;e=d}return null}function j(a){var b=a.nodeType;return 3==b||4==b||8==b}function k(a,b){var c=b.nextSibling,d=b.parentNode;return c?d.insertBefore(a,c):d.appendChild(a),a}function l(a,b){var c=a.cloneNode(!1);return c.deleteData(0,b),a.deleteData(b,a.length-b),k(c,a),c}function m(a){if(9==a.nodeType)return a;if(typeof a.ownerDocument!=z)return a.ownerDocument;if(typeof a.document!=z)return a.document;if(a.parentNode)return m(a.parentNode);throw new Error("getDocument: no document found for node")}function n(a){var b=m(a);if(typeof b.defaultView!=z)return b.defaultView;if(typeof b.parentWindow!=z)return b.parentWindow;throw new Error("Cannot get a window object for node")}function o(a){if(typeof a.contentDocument!=z)return a.contentDocument;if(typeof a.contentWindow!=z)return a.contentWindow.document;throw new Error("getIframeWindow: No Document object found for iframe element")}function p(a){if(typeof a.contentWindow!=z)return a.contentWindow;if(typeof a.contentDocument!=z)return a.contentDocument.defaultView;throw new Error("getIframeWindow: No Window object found for iframe element")}function q(a){return A.isHostObject(a,"body")?a.body:a.getElementsByTagName("body")[0]}function r(a){for(var b;b=a.parentNode;)a=b;return a}function s(a,b,c,d){var f,h,j,k,l;if(a==c)return b===d?0:d>b?-1:1;if(f=i(c,a,!0))return b<=e(f)?-1:1;if(f=i(a,c,!0))return e(f)<d?-1:1;if(h=g(a,c),j=a===h?h:i(a,h,!0),k=c===h?h:i(c,h,!0),j===k)throw new Error("comparePoints got to case 4 and childA and childB are the same!");for(l=h.firstChild;l;){if(l===j)return-1;if(l===k)return 1;l=l.nextSibling}throw new Error("Should not be here!")}function t(a){for(var b,c=m(a).createDocumentFragment();b=a.firstChild;)c.appendChild(b);return c}function u(a){if(!a)return"[No node]";if(j(a))return'"'+a.data+'"';if(1==a.nodeType){var b=a.id?' id="'+a.id+'"':"";return"<"+a.nodeName+b+">["+a.childNodes.length+"]"}return a.nodeName}function v(a){this.root=a,this._next=a}function w(a){return new v(a)}function x(a,b){this.node=a,this.offset=b}function y(a){this.code=this[a],this.codeName=a,this.message="DOMException: "+this.codeName}var z="undefined",A=a.util;A.areHostMethods(document,["createDocumentFragment","createElement","createTextNode"])||b.fail("document missing a Node creation method"),A.isHostMethod(document,"getElementsByTagName")||b.fail("document missing getElementsByTagName method");var B=document.createElement("div");A.areHostMethods(B,["insertBefore","appendChild","cloneNode"]||!A.areHostObjects(B,["previousSibling","nextSibling","childNodes","parentNode"]))||b.fail("Incomplete Element implementation"),A.isHostProperty(B,"innerHTML")||b.fail("Element is missing innerHTML property");var C=document.createTextNode("test");A.areHostMethods(C,["splitText","deleteData","insertData","appendData","cloneNode"]||!A.areHostObjects(B,["previousSibling","nextSibling","childNodes","parentNode"])||!A.areHostProperties(C,["data"]))||b.fail("Incomplete Text Node implementation");var D=function(a,b){for(var c=a.length;c--;)if(a[c]===b)return!0;return!1};v.prototype={_current:null,hasNext:function(){return!!this._next},next:function(){var a,b,c=this._current=this._next;if(this._current)if(a=c.firstChild)this._next=a;else{for(b=null;c!==this.root&&!(b=c.nextSibling);)c=c.parentNode;this._next=b}return this._current},detach:function(){this._current=this._next=this.root=null}},x.prototype={equals:function(a){return this.node===a.node&this.offset==a.offset},inspect:function(){return"[DomPosition("+u(this.node)+":"+this.offset+")]"}},y.prototype={INDEX_SIZE_ERR:1,HIERARCHY_REQUEST_ERR:3,WRONG_DOCUMENT_ERR:4,NO_MODIFICATION_ALLOWED_ERR:7,NOT_FOUND_ERR:8,NOT_SUPPORTED_ERR:9,INVALID_STATE_ERR:11},y.prototype.toString=function(){return this.message},a.dom={arrayContains:D,isHtmlNamespace:c,parentElement:d,getNodeIndex:e,getNodeLength:f,getCommonAncestor:g,isAncestorOf:h,getClosestAncestorIn:i,isCharacterDataNode:j,insertAfter:k,splitDataNode:l,getDocument:m,getWindow:n,getIframeWindow:p,getIframeDocument:o,getBody:q,getRootContainer:r,comparePoints:s,inspectNode:u,fragmentFromNodeChildren:t,createIterator:w,DomPosition:x},a.DOMException=y}),rangy.createModule("DomRange",function(a){function b(a,b){return 3!=a.nodeType&&(L.isAncestorOf(a,b.startContainer,!0)||L.isAncestorOf(a,b.endContainer,!0))}function c(a){return L.getDocument(a.startContainer)}function d(a,b,c){var d=a._listeners[b];if(d)for(var e=0,f=d.length;f>e;++e)d[e].call(a,{target:a,args:c})}function e(a){return new M(a.parentNode,L.getNodeIndex(a))}function f(a){return new M(a.parentNode,L.getNodeIndex(a)+1)}function g(a,b,c){var d=11==a.nodeType?a.firstChild:a;return L.isCharacterDataNode(b)?c==b.length?L.insertAfter(a,b):b.parentNode.insertBefore(a,0==c?b:L.splitDataNode(b,c)):c>=b.childNodes.length?b.appendChild(a):b.insertBefore(a,b.childNodes[c]),d}function h(a){for(var b,d,e,f=c(a.range).createDocumentFragment();d=a.next();){if(b=a.isPartiallySelectedSubtree(),d=d.cloneNode(!b),b&&(e=a.getSubtreeIterator(),d.appendChild(h(e)),e.detach(!0)),10==d.nodeType)throw new N("HIERARCHY_REQUEST_ERR");f.appendChild(d)}return f}function i(a,b,c){var d,e;c=c||{stop:!1};for(var f,g;f=a.next();)if(a.isPartiallySelectedSubtree()){if(b(f)===!1)return void(c.stop=!0);if(g=a.getSubtreeIterator(),i(g,b,c),g.detach(!0),c.stop)return}else for(d=L.createIterator(f);e=d.next();)if(b(e)===!1)return void(c.stop=!0)}function j(a){for(var b;a.next();)a.isPartiallySelectedSubtree()?(b=a.getSubtreeIterator(),j(b),b.detach(!0)):a.remove()}function k(a){for(var b,d,e=c(a.range).createDocumentFragment();b=a.next();){if(a.isPartiallySelectedSubtree()?(b=b.cloneNode(!1),d=a.getSubtreeIterator(),b.appendChild(k(d)),d.detach(!0)):a.remove(),10==b.nodeType)throw new N("HIERARCHY_REQUEST_ERR");e.appendChild(b)}return e}function l(a,b,c){var d,e=!(!b||!b.length),f=!!c;e&&(d=new RegExp("^("+b.join("|")+")$"));var g=[];return i(new n(a,!1),function(a){e&&!d.test(a.nodeType)||f&&!c(a)||g.push(a)}),g}function m(a){var b="undefined"==typeof a.getName?"Range":a.getName();return"["+b+"("+L.inspectNode(a.startContainer)+":"+a.startOffset+", "+L.inspectNode(a.endContainer)+":"+a.endOffset+")]"}function n(a,b){if(this.range=a,this.clonePartiallySelectedTextNodes=b,!a.collapsed){this.sc=a.startContainer,this.so=a.startOffset,this.ec=a.endContainer,this.eo=a.endOffset;var c=a.commonAncestorContainer;this.sc===this.ec&&L.isCharacterDataNode(this.sc)?(this.isSingleCharacterDataNode=!0,this._first=this._last=this._next=this.sc):(this._first=this._next=this.sc!==c||L.isCharacterDataNode(this.sc)?L.getClosestAncestorIn(this.sc,c,!0):this.sc.childNodes[this.so],this._last=this.ec!==c||L.isCharacterDataNode(this.ec)?L.getClosestAncestorIn(this.ec,c,!0):this.ec.childNodes[this.eo-1])}}function o(a){this.code=this[a],this.codeName=a,this.message="RangeException: "+this.codeName}function p(a,b,c){this.nodes=l(a,b,c),this._next=this.nodes[0],this._position=0}function q(a){return function(b,c){for(var d,e=c?b:b.parentNode;e;){if(d=e.nodeType,L.arrayContains(a,d))return e;e=e.parentNode}return null}}function r(a,b){if(W(a,b))throw new o("INVALID_NODE_TYPE_ERR")}function s(a){if(!a.startContainer)throw new N("INVALID_STATE_ERR")}function t(a,b){if(!L.arrayContains(b,a.nodeType))throw new o("INVALID_NODE_TYPE_ERR")}function u(a,b){if(0>b||b>(L.isCharacterDataNode(a)?a.length:a.childNodes.length))throw new N("INDEX_SIZE_ERR")}function v(a,b){if(U(a,!0)!==U(b,!0))throw new N("WRONG_DOCUMENT_ERR")}function w(a){if(V(a,!0))throw new N("NO_MODIFICATION_ALLOWED_ERR")}function x(a,b){if(!a)throw new N(b)}function y(a){return!L.arrayContains(P,a.nodeType)&&!U(a,!0)}function z(a,b){return b<=(L.isCharacterDataNode(a)?a.length:a.childNodes.length)}function A(a){return!!a.startContainer&&!!a.endContainer&&!y(a.startContainer)&&!y(a.endContainer)&&z(a.startContainer,a.startOffset)&&z(a.endContainer,a.endOffset)}function B(a){if(s(a),!A(a))throw new Error("Range error: Range is no longer valid after DOM mutation ("+a.inspect()+")")}function C(){}function D(a){a.START_TO_START=ab,a.START_TO_END=bb,a.END_TO_END=cb,a.END_TO_START=db,a.NODE_BEFORE=eb,a.NODE_AFTER=fb,a.NODE_BEFORE_AND_AFTER=gb,a.NODE_INSIDE=hb}function E(a){D(a),D(a.prototype)}function F(a,b){return function(){B(this);var c,d,e=this.startContainer,g=this.startOffset,h=this.commonAncestorContainer,j=new n(this,!0);e!==h&&(c=L.getClosestAncestorIn(e,h,!0),d=f(c),e=d.node,g=d.offset),i(j,w),j.reset();var k=a(j);return j.detach(),b(this,e,g,e,g),k}}function G(c,d,g){function h(a,b){return function(c){s(this),t(c,O),t(T(c),P);var d=(a?e:f)(c);(b?i:l)(this,d.node,d.offset)}}function i(a,b,c){var e=a.endContainer,f=a.endOffset;(b!==a.startContainer||c!==a.startOffset)&&((T(b)!=T(e)||1==L.comparePoints(b,c,e,f))&&(e=b,f=c),d(a,b,c,e,f))}function l(a,b,c){var e=a.startContainer,f=a.startOffset;(b!==a.endContainer||c!==a.endOffset)&&((T(b)!=T(e)||-1==L.comparePoints(b,c,e,f))&&(e=b,f=c),d(a,e,f,b,c))}function m(a,b,c){(b!==a.startContainer||c!==a.startOffset||b!==a.endContainer||c!==a.endOffset)&&d(a,b,c,b,c)}c.prototype=new C,a.util.extend(c.prototype,{setStart:function(a,b){s(this),r(a,!0),u(a,b),i(this,a,b)},setEnd:function(a,b){s(this),r(a,!0),u(a,b),l(this,a,b)},setStartBefore:h(!0,!0),setStartAfter:h(!1,!0),setEndBefore:h(!0,!1),setEndAfter:h(!1,!1),collapse:function(a){B(this),a?d(this,this.startContainer,this.startOffset,this.startContainer,this.startOffset):d(this,this.endContainer,this.endOffset,this.endContainer,this.endOffset)},selectNodeContents:function(a){s(this),r(a,!0),d(this,a,0,a,L.getNodeLength(a))},selectNode:function(a){s(this),r(a,!1),t(a,O);var b=e(a),c=f(a);d(this,b.node,b.offset,c.node,c.offset)},extractContents:F(k,d),deleteContents:F(j,d),canSurroundContents:function(){B(this),w(this.startContainer),w(this.endContainer);var a=new n(this,!0),c=a._first&&b(a._first,this)||a._last&&b(a._last,this);return a.detach(),!c},detach:function(){g(this)},splitBoundaries:function(){B(this);var a=this.startContainer,b=this.startOffset,c=this.endContainer,e=this.endOffset,f=a===c;L.isCharacterDataNode(c)&&e>0&&e<c.length&&L.splitDataNode(c,e),L.isCharacterDataNode(a)&&b>0&&b<a.length&&(a=L.splitDataNode(a,b),f?(e-=b,c=a):c==a.parentNode&&e>=L.getNodeIndex(a)&&e++,b=0),d(this,a,b,c,e)},normalizeBoundaries:function(){B(this);var a=this.startContainer,b=this.startOffset,c=this.endContainer,e=this.endOffset,f=function(a){var b=a.nextSibling;b&&b.nodeType==a.nodeType&&(c=a,e=a.length,a.appendData(b.data),b.parentNode.removeChild(b))},g=function(d){var f=d.previousSibling;if(f&&f.nodeType==d.nodeType){a=d;var g=d.length;if(b=f.length,d.insertData(0,f.data),f.parentNode.removeChild(f),a==c)e+=b,c=a;else if(c==d.parentNode){var h=L.getNodeIndex(d);e==h?(c=d,e=g):e>h&&e--}}},h=!0;if(L.isCharacterDataNode(c))c.length==e&&f(c);else{if(e>0){var i=c.childNodes[e-1];i&&L.isCharacterDataNode(i)&&f(i)}h=!this.collapsed}if(h){if(L.isCharacterDataNode(a))0==b&&g(a);else if(b<a.childNodes.length){var j=a.childNodes[b];j&&L.isCharacterDataNode(j)&&g(j)}}else a=c,b=e;d(this,a,b,c,e)},collapseToPoint:function(a,b){s(this),r(a,!0),u(a,b),m(this,a,b)}}),E(c)}function H(a){a.collapsed=a.startContainer===a.endContainer&&a.startOffset===a.endOffset,a.commonAncestorContainer=a.collapsed?a.startContainer:L.getCommonAncestor(a.startContainer,a.endContainer)}function I(a,b,c,e,f){var g=a.startContainer!==b||a.startOffset!==c,h=a.endContainer!==e||a.endOffset!==f;a.startContainer=b,a.startOffset=c,a.endContainer=e,a.endOffset=f,H(a),d(a,"boundarychange",{startMoved:g,endMoved:h})}function J(a){s(a),a.startContainer=a.startOffset=a.endContainer=a.endOffset=null,a.collapsed=a.commonAncestorContainer=null,d(a,"detach",null),a._listeners=null}function K(a){this.startContainer=a,this.startOffset=0,this.endContainer=a,this.endOffset=0,this._listeners={boundarychange:[],detach:[]},H(this)}a.requireModules(["DomUtil"]);var L=a.dom,M=L.DomPosition,N=a.DOMException;n.prototype={_current:null,_next:null,_first:null,_last:null,isSingleCharacterDataNode:!1,reset:function(){this._current=null,this._next=this._first},hasNext:function(){return!!this._next},next:function(){var a=this._current=this._next;return a&&(this._next=a!==this._last?a.nextSibling:null,L.isCharacterDataNode(a)&&this.clonePartiallySelectedTextNodes&&(a===this.ec&&(a=a.cloneNode(!0)).deleteData(this.eo,a.length-this.eo),this._current===this.sc&&(a=a.cloneNode(!0)).deleteData(0,this.so))),a},remove:function(){var a,b,c=this._current;!L.isCharacterDataNode(c)||c!==this.sc&&c!==this.ec?c.parentNode&&c.parentNode.removeChild(c):(a=c===this.sc?this.so:0,b=c===this.ec?this.eo:c.length,a!=b&&c.deleteData(a,b-a))},isPartiallySelectedSubtree:function(){var a=this._current;return b(a,this.range)},getSubtreeIterator:function(){var a;if(this.isSingleCharacterDataNode)a=this.range.cloneRange(),a.collapse();else{a=new K(c(this.range));var b=this._current,d=b,e=0,f=b,g=L.getNodeLength(b);L.isAncestorOf(b,this.sc,!0)&&(d=this.sc,e=this.so),L.isAncestorOf(b,this.ec,!0)&&(f=this.ec,g=this.eo),I(a,d,e,f,g)}return new n(a,this.clonePartiallySelectedTextNodes)},detach:function(a){a&&this.range.detach(),this.range=this._current=this._next=this._first=this._last=this.sc=this.so=this.ec=this.eo=null}},o.prototype={BAD_BOUNDARYPOINTS_ERR:1,INVALID_NODE_TYPE_ERR:2},o.prototype.toString=function(){return this.message},p.prototype={_current:null,hasNext:function(){return!!this._next},next:function(){return this._current=this._next,this._next=this.nodes[++this._position],this._current},detach:function(){this._current=this._next=this.nodes=null}};var O=[1,3,4,5,7,8,10],P=[2,9,11],Q=[5,6,10,12],R=[1,3,4,5,7,8,10,11],S=[1,3,4,5,7,8],T=L.getRootContainer,U=q([9,11]),V=q(Q),W=q([6,10,12]),X=document.createElement("style"),Y=!1;try{X.innerHTML="<b>x</b>",Y=3==X.firstChild.nodeType}catch(Z){}a.features.htmlParsingConforms=Y;var $=Y?function(a){var b=this.startContainer,c=L.getDocument(b);if(!b)throw new N("INVALID_STATE_ERR");var d=null;return 1==b.nodeType?d=b:L.isCharacterDataNode(b)&&(d=L.parentElement(b)),d=null===d||"HTML"==d.nodeName&&L.isHtmlNamespace(L.getDocument(d).documentElement)&&L.isHtmlNamespace(d)?c.createElement("body"):d.cloneNode(!1),d.innerHTML=a,L.fragmentFromNodeChildren(d)}:function(a){s(this);var b=c(this),d=b.createElement("body");return d.innerHTML=a,L.fragmentFromNodeChildren(d)},_=["startContainer","startOffset","endContainer","endOffset","collapsed","commonAncestorContainer"],ab=0,bb=1,cb=2,db=3,eb=0,fb=1,gb=2,hb=3;C.prototype={attachListener:function(a,b){this._listeners[a].push(b)},compareBoundaryPoints:function(a,b){B(this),v(this.startContainer,b.startContainer);var c,d,e,f,g=a==db||a==ab?"start":"end",h=a==bb||a==ab?"start":"end";return c=this[g+"Container"],d=this[g+"Offset"],e=b[h+"Container"],f=b[h+"Offset"],L.comparePoints(c,d,e,f)},insertNode:function(a){if(B(this),t(a,R),w(this.startContainer),L.isAncestorOf(a,this.startContainer,!0))throw new N("HIERARCHY_REQUEST_ERR");var b=g(a,this.startContainer,this.startOffset);this.setStartBefore(b)},cloneContents:function(){B(this);var a,b;if(this.collapsed)return c(this).createDocumentFragment();if(this.startContainer===this.endContainer&&L.isCharacterDataNode(this.startContainer))return a=this.startContainer.cloneNode(!0),a.data=a.data.slice(this.startOffset,this.endOffset),b=c(this).createDocumentFragment(),b.appendChild(a),b;var d=new n(this,!0);return a=h(d),d.detach(),a},canSurroundContents:function(){B(this),w(this.startContainer),w(this.endContainer);var a=new n(this,!0),c=a._first&&b(a._first,this)||a._last&&b(a._last,this);return a.detach(),!c},surroundContents:function(a){if(t(a,S),!this.canSurroundContents())throw new o("BAD_BOUNDARYPOINTS_ERR");var b=this.extractContents();if(a.hasChildNodes())for(;a.lastChild;)a.removeChild(a.lastChild);g(a,this.startContainer,this.startOffset),a.appendChild(b),this.selectNode(a)},cloneRange:function(){B(this);for(var a,b=new K(c(this)),d=_.length;d--;)a=_[d],b[a]=this[a];return b},toString:function(){B(this);var a=this.startContainer;if(a===this.endContainer&&L.isCharacterDataNode(a))return 3==a.nodeType||4==a.nodeType?a.data.slice(this.startOffset,this.endOffset):"";var b=[],c=new n(this,!0);return i(c,function(a){(3==a.nodeType||4==a.nodeType)&&b.push(a.data)}),c.detach(),b.join("")},compareNode:function(a){B(this);var b=a.parentNode,c=L.getNodeIndex(a);if(!b)throw new N("NOT_FOUND_ERR");var d=this.comparePoint(b,c),e=this.comparePoint(b,c+1);return 0>d?e>0?gb:eb:e>0?fb:hb},comparePoint:function(a,b){return B(this),x(a,"HIERARCHY_REQUEST_ERR"),v(a,this.startContainer),L.comparePoints(a,b,this.startContainer,this.startOffset)<0?-1:L.comparePoints(a,b,this.endContainer,this.endOffset)>0?1:0},createContextualFragment:$,toHtml:function(){B(this);var a=c(this).createElement("div");return a.appendChild(this.cloneContents()),a.innerHTML},intersectsNode:function(a,b){if(B(this),x(a,"NOT_FOUND_ERR"),L.getDocument(a)!==c(this))return!1;var d=a.parentNode,e=L.getNodeIndex(a);x(d,"NOT_FOUND_ERR");var f=L.comparePoints(d,e,this.endContainer,this.endOffset),g=L.comparePoints(d,e+1,this.startContainer,this.startOffset);return b?0>=f&&g>=0:0>f&&g>0},isPointInRange:function(a,b){return B(this),x(a,"HIERARCHY_REQUEST_ERR"),v(a,this.startContainer),L.comparePoints(a,b,this.startContainer,this.startOffset)>=0&&L.comparePoints(a,b,this.endContainer,this.endOffset)<=0},intersectsRange:function(a,b){if(B(this),c(a)!=c(this))throw new N("WRONG_DOCUMENT_ERR");var d=L.comparePoints(this.startContainer,this.startOffset,a.endContainer,a.endOffset),e=L.comparePoints(this.endContainer,this.endOffset,a.startContainer,a.startOffset);return b?0>=d&&e>=0:0>d&&e>0},intersection:function(a){if(this.intersectsRange(a)){var b=L.comparePoints(this.startContainer,this.startOffset,a.startContainer,a.startOffset),c=L.comparePoints(this.endContainer,this.endOffset,a.endContainer,a.endOffset),d=this.cloneRange();return-1==b&&d.setStart(a.startContainer,a.startOffset),1==c&&d.setEnd(a.endContainer,a.endOffset),d}return null},union:function(a){if(this.intersectsRange(a,!0)){var b=this.cloneRange();return-1==L.comparePoints(a.startContainer,a.startOffset,this.startContainer,this.startOffset)&&b.setStart(a.startContainer,a.startOffset),1==L.comparePoints(a.endContainer,a.endOffset,this.endContainer,this.endOffset)&&b.setEnd(a.endContainer,a.endOffset),b}throw new o("Ranges do not intersect")},containsNode:function(a,b){return b?this.intersectsNode(a,!1):this.compareNode(a)==hb},containsNodeContents:function(a){return this.comparePoint(a,0)>=0&&this.comparePoint(a,L.getNodeLength(a))<=0},containsRange:function(a){return this.intersection(a).equals(a)},containsNodeText:function(a){var b=this.cloneRange();b.selectNode(a);var c=b.getNodes([3]);if(c.length>0){b.setStart(c[0],0);var d=c.pop();b.setEnd(d,d.length);var e=this.containsRange(b);return b.detach(),e}return this.containsNodeContents(a)},createNodeIterator:function(a,b){return B(this),new p(this,a,b)},getNodes:function(a,b){return B(this),l(this,a,b)},getDocument:function(){return c(this)},collapseBefore:function(a){s(this),this.setEndBefore(a),this.collapse(!1)},collapseAfter:function(a){s(this),this.setStartAfter(a),this.collapse(!0)},getName:function(){return"DomRange"},equals:function(a){return K.rangesEqual(this,a)},isValid:function(){return A(this)},inspect:function(){return m(this)}},G(K,I,J),a.rangePrototype=C.prototype,K.rangeProperties=_,K.RangeIterator=n,K.copyComparisonConstants=E,K.createPrototypeRange=G,K.inspect=m,K.getRangeDocument=c,K.rangesEqual=function(a,b){return a.startContainer===b.startContainer&&a.startOffset===b.startOffset&&a.endContainer===b.endContainer&&a.endOffset===b.endOffset},a.DomRange=K,a.RangeException=o}),rangy.createModule("WrappedRange",function(a){function b(a){var b=a.parentElement(),c=a.duplicate();c.collapse(!0);var d=c.parentElement();c=a.duplicate(),c.collapse(!1);var e=c.parentElement(),f=d==e?d:g.getCommonAncestor(d,e);return f==b?f:g.getCommonAncestor(b,f)}function c(a){return 0==a.compareEndPoints("StartToEnd",a)}function d(a,b,c,d){var e=a.duplicate();e.collapse(c);var f=e.parentElement();if(g.isAncestorOf(b,f,!0)||(f=b),!f.canHaveHTML)return new h(f.parentNode,g.getNodeIndex(f));var i,j,k,l,m,n=g.getDocument(f).createElement("span"),o=c?"StartToStart":"StartToEnd";do f.insertBefore(n,n.previousSibling),e.moveToElementText(n);while((i=e.compareEndPoints(o,a))>0&&n.previousSibling);if(m=n.nextSibling,-1==i&&m&&g.isCharacterDataNode(m)){e.setEndPoint(c?"EndToStart":"EndToEnd",a);var p;if(/[\r\n]/.test(m.data)){var q=e.duplicate(),r=q.text.replace(/\r\n/g,"\r").length;for(p=q.moveStart("character",r);-1==(i=q.compareEndPoints("StartToEnd",q));)p++,q.moveStart("character",1)}else p=e.text.length;l=new h(m,p)}else j=(d||!c)&&n.previousSibling,k=(d||c)&&n.nextSibling,l=k&&g.isCharacterDataNode(k)?new h(k,0):j&&g.isCharacterDataNode(j)?new h(j,j.length):new h(f,g.getNodeIndex(n));return n.parentNode.removeChild(n),l}function e(a,b){var c,d,e,f,h=a.offset,i=g.getDocument(a.node),j=i.body.createTextRange(),k=g.isCharacterDataNode(a.node);return k?(c=a.node,d=c.parentNode):(f=a.node.childNodes,c=h<f.length?f[h]:null,d=a.node),e=i.createElement("span"),e.innerHTML="&#feff;",c?d.insertBefore(e,c):d.appendChild(e),j.moveToElementText(e),j.collapse(!b),d.removeChild(e),k&&j[b?"moveStart":"moveEnd"]("character",h),j}a.requireModules(["DomUtil","DomRange"]);var f,g=a.dom,h=g.DomPosition,i=a.DomRange;if(!a.features.implementsDomRange||a.features.implementsTextRange&&a.config.preferTextRange){if(a.features.implementsTextRange){f=function(a){this.textRange=a,this.refresh()},f.prototype=new i(document),f.prototype.refresh=function(){var a,e,f=b(this.textRange);c(this.textRange)?e=a=d(this.textRange,f,!0,!0):(a=d(this.textRange,f,!0,!1),e=d(this.textRange,f,!1,!1)),this.setStart(a.node,a.offset),this.setEnd(e.node,e.offset)},i.copyComparisonConstants(f);var j=function(){return this}();"undefined"==typeof j.Range&&(j.Range=f),a.createNativeRange=function(a){return a=a||document,a.body.createTextRange()}}}else!function(){function b(a){for(var b,c=k.length;c--;)b=k[c],a[b]=a.nativeRange[b]}function c(a,b,c,d,e){var f=a.startContainer!==b||a.startOffset!=c,g=a.endContainer!==d||a.endOffset!=e;(f||g)&&(a.setEnd(d,e),a.setStart(b,c))}function d(a){a.nativeRange.detach(),a.detached=!0;for(var b,c=k.length;c--;)b=k[c],a[b]=null}var e,h,j,k=i.rangeProperties;f=function(a){if(!a)throw new Error("Range must be specified");this.nativeRange=a,b(this)},i.createPrototypeRange(f,c,d),e=f.prototype,e.selectNode=function(a){this.nativeRange.selectNode(a),b(this)},e.deleteContents=function(){this.nativeRange.deleteContents(),b(this)},e.extractContents=function(){var a=this.nativeRange.extractContents();return b(this),a},e.cloneContents=function(){return this.nativeRange.cloneContents()},e.surroundContents=function(a){this.nativeRange.surroundContents(a),b(this)},e.collapse=function(a){this.nativeRange.collapse(a),b(this)},e.cloneRange=function(){return new f(this.nativeRange.cloneRange())},e.refresh=function(){b(this)},e.toString=function(){return this.nativeRange.toString()};var l=document.createTextNode("test");g.getBody(document).appendChild(l);var m=document.createRange();m.setStart(l,0),m.setEnd(l,0);try{m.setStart(l,1),h=!0,e.setStart=function(a,c){this.nativeRange.setStart(a,c),b(this)},e.setEnd=function(a,c){this.nativeRange.setEnd(a,c),b(this)},j=function(a){return function(c){this.nativeRange[a](c),b(this)}}}catch(n){h=!1,e.setStart=function(a,c){try{this.nativeRange.setStart(a,c)}catch(d){this.nativeRange.setEnd(a,c),this.nativeRange.setStart(a,c)}b(this)},e.setEnd=function(a,c){try{this.nativeRange.setEnd(a,c)}catch(d){this.nativeRange.setStart(a,c),this.nativeRange.setEnd(a,c)}b(this)},j=function(a,c){return function(d){try{this.nativeRange[a](d)}catch(e){this.nativeRange[c](d),this.nativeRange[a](d)}b(this)}}}e.setStartBefore=j("setStartBefore","setEndBefore"),e.setStartAfter=j("setStartAfter","setEndAfter"),e.setEndBefore=j("setEndBefore","setStartBefore"),e.setEndAfter=j("setEndAfter","setStartAfter"),m.selectNodeContents(l),e.selectNodeContents=m.startContainer==l&&m.endContainer==l&&0==m.startOffset&&m.endOffset==l.length?function(a){this.nativeRange.selectNodeContents(a),b(this)}:function(a){this.setStart(a,0),this.setEnd(a,i.getEndOffset(a))},m.selectNodeContents(l),m.setEnd(l,3);var o=document.createRange();o.selectNodeContents(l),o.setEnd(l,4),o.setStart(l,2),e.compareBoundaryPoints=-1==m.compareBoundaryPoints(m.START_TO_END,o)&1==m.compareBoundaryPoints(m.END_TO_START,o)?function(a,b){return b=b.nativeRange||b,a==b.START_TO_END?a=b.END_TO_START:a==b.END_TO_START&&(a=b.START_TO_END),this.nativeRange.compareBoundaryPoints(a,b)}:function(a,b){return this.nativeRange.compareBoundaryPoints(a,b.nativeRange||b)},a.util.isHostMethod(m,"createContextualFragment")&&(e.createContextualFragment=function(a){return this.nativeRange.createContextualFragment(a)}),g.getBody(document).removeChild(l),m.detach(),o.detach()}(),a.createNativeRange=function(a){return a=a||document,a.createRange()};a.features.implementsTextRange&&(f.rangeToTextRange=function(a){if(a.collapsed){var b=e(new h(a.startContainer,a.startOffset),!0);return b}var c=e(new h(a.startContainer,a.startOffset),!0),d=e(new h(a.endContainer,a.endOffset),!1),f=g.getDocument(a.startContainer).body.createTextRange();return f.setEndPoint("StartToStart",c),f.setEndPoint("EndToEnd",d),f}),f.prototype.getName=function(){return"WrappedRange"},a.WrappedRange=f,a.createRange=function(b){return b=b||document,new f(a.createNativeRange(b))},a.createRangyRange=function(a){return a=a||document,new i(a)},a.createIframeRange=function(b){return a.createRange(g.getIframeDocument(b))},a.createIframeRangyRange=function(b){return a.createRangyRange(g.getIframeDocument(b))},a.addCreateMissingNativeApiListener(function(b){var c=b.document;"undefined"==typeof c.createRange&&(c.createRange=function(){return a.createRange(this)}),c=b=null})}),rangy.createModule("WrappedSelection",function(a,b){function c(a){return(a||window).getSelection()}function d(a){return(a||window).document.selection}function e(a,b,c){var d=c?"end":"start",e=c?"start":"end";a.anchorNode=b[d+"Container"],a.anchorOffset=b[d+"Offset"],a.focusNode=b[e+"Container"],a.focusOffset=b[e+"Offset"]}function f(a){var b=a.nativeSelection;a.anchorNode=b.anchorNode,a.anchorOffset=b.anchorOffset,a.focusNode=b.focusNode,a.focusOffset=b.focusOffset}function g(a){a.anchorNode=a.focusNode=null,a.anchorOffset=a.focusOffset=0,a.rangeCount=0,a.isCollapsed=!0,a._ranges.length=0}function h(b){var c;return b instanceof y?(c=b._selectionNativeRange,c||(c=a.createNativeRange(w.getDocument(b.startContainer)),c.setEnd(b.endContainer,b.endOffset),c.setStart(b.startContainer,b.startOffset),b._selectionNativeRange=c,b.attachListener("detach",function(){this._selectionNativeRange=null}))):b instanceof z?c=b.nativeRange:a.features.implementsDomRange&&b instanceof w.getWindow(b.startContainer).Range&&(c=b),c}function i(a){if(!a.length||1!=a[0].nodeType)return!1;for(var b=1,c=a.length;c>b;++b)if(!w.isAncestorOf(a[0],a[b]))return!1;return!0}function j(a){var b=a.getNodes();if(!i(b))throw new Error("getSingleElementFromRange: range "+a.inspect()+" did not consist of a single element");return b[0]}function k(a){return!!a&&"undefined"!=typeof a.text}function l(a,b){var c=new z(b);a._ranges=[c],e(a,c,!1),a.rangeCount=1,a.isCollapsed=c.collapsed}function m(b){if(b._ranges.length=0,"None"==b.docSelection.type)g(b);else{var c=b.docSelection.createRange();if(k(c))l(b,c);else{b.rangeCount=c.length;for(var d,f=w.getDocument(c.item(0)),h=0;h<b.rangeCount;++h)d=a.createRange(f),d.selectNode(c.item(h)),b._ranges.push(d);
b.isCollapsed=1==b.rangeCount&&b._ranges[0].collapsed,e(b,b._ranges[b.rangeCount-1],!1)}}}function n(a,b){for(var c=a.docSelection.createRange(),d=j(b),e=w.getDocument(c.item(0)),f=w.getBody(e).createControlRange(),g=0,h=c.length;h>g;++g)f.add(c.item(g));try{f.add(d)}catch(i){throw new Error("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)")}f.select(),m(a)}function o(a,b,c){this.nativeSelection=a,this.docSelection=b,this._ranges=[],this.win=c,this.refresh()}function p(a,b){for(var c,d=w.getDocument(b[0].startContainer),e=w.getBody(d).createControlRange(),f=0;f<rangeCount;++f){c=j(b[f]);try{e.add(c)}catch(g){throw new Error("setRanges(): Element within the one of the specified Ranges could not be added to control selection (does it have layout?)")}}e.select(),m(a)}function q(a,b){if(a.anchorNode&&w.getDocument(a.anchorNode)!==w.getDocument(b))throw new A("WRONG_DOCUMENT_ERR")}function r(a){var b=[],c=new B(a.anchorNode,a.anchorOffset),d=new B(a.focusNode,a.focusOffset),e="function"==typeof a.getName?a.getName():"Selection";if("undefined"!=typeof a.rangeCount)for(var f=0,g=a.rangeCount;g>f;++f)b[f]=y.inspect(a.getRangeAt(f));return"["+e+"(Ranges: "+b.join(", ")+")(anchor: "+c.inspect()+", focus: "+d.inspect()+"]"}a.requireModules(["DomUtil","DomRange","WrappedRange"]),a.config.checkSelectionRanges=!0;var s,t,u="boolean",v="_rangySelection",w=a.dom,x=a.util,y=a.DomRange,z=a.WrappedRange,A=a.DOMException,B=w.DomPosition,C="Control",D=a.util.isHostMethod(window,"getSelection"),E=a.util.isHostObject(document,"selection"),F=E&&(!D||a.config.preferTextRange);F?(s=d,a.isSelectionValid=function(a){var b=(a||window).document,c=b.selection;return"None"!=c.type||w.getDocument(c.createRange().parentElement())==b}):D?(s=c,a.isSelectionValid=function(){return!0}):b.fail("Neither document.selection or window.getSelection() detected."),a.getNativeSelection=s;var G=s(),H=a.createNativeRange(document),I=w.getBody(document),J=x.areHostObjects(G,["anchorNode","focusNode"]&&x.areHostProperties(G,["anchorOffset","focusOffset"]));a.features.selectionHasAnchorAndFocus=J;var K=x.isHostMethod(G,"extend");a.features.selectionHasExtend=K;var L="number"==typeof G.rangeCount;a.features.selectionHasRangeCount=L;var M=!1,N=!0;x.areHostMethods(G,["addRange","getRangeAt","removeAllRanges"])&&"number"==typeof G.rangeCount&&a.features.implementsDomRange&&!function(){var a=document.createElement("iframe");a.frameBorder=0,a.style.position="absolute",a.style.left="-10000px",I.appendChild(a);var b=w.getIframeDocument(a);b.open(),b.write("<html><head></head><body>12</body></html>"),b.close();var c=w.getIframeWindow(a).getSelection(),d=b.documentElement,e=d.lastChild,f=e.firstChild,g=b.createRange();g.setStart(f,1),g.collapse(!0),c.addRange(g),N=1==c.rangeCount,c.removeAllRanges();var h=g.cloneRange();g.setStart(f,0),h.setEnd(f,2),c.addRange(g),c.addRange(h),M=2==c.rangeCount,g.detach(),h.detach(),I.removeChild(a)}(),a.features.selectionSupportsMultipleRanges=M,a.features.collapsedNonEditableSelectionsSupported=N;var O,P=!1;I&&x.isHostMethod(I,"createControlRange")&&(O=I.createControlRange(),x.areHostProperties(O,["item","add"])&&(P=!0)),a.features.implementsControlRange=P,t=J?function(a){return a.anchorNode===a.focusNode&&a.anchorOffset===a.focusOffset}:function(a){return a.rangeCount?a.getRangeAt(a.rangeCount-1).collapsed:!1};var Q;x.isHostMethod(G,"getRangeAt")?Q=function(a,b){try{return a.getRangeAt(b)}catch(c){return null}}:J&&(Q=function(b){var c=w.getDocument(b.anchorNode),d=a.createRange(c);return d.setStart(b.anchorNode,b.anchorOffset),d.setEnd(b.focusNode,b.focusOffset),d.collapsed!==this.isCollapsed&&(d.setStart(b.focusNode,b.focusOffset),d.setEnd(b.anchorNode,b.anchorOffset)),d}),a.getSelection=function(a){a=a||window;var b=a[v],c=s(a),e=E?d(a):null;return b?(b.nativeSelection=c,b.docSelection=e,b.refresh(a)):(b=new o(c,e,a),a[v]=b),b},a.getIframeSelection=function(b){return a.getSelection(w.getIframeWindow(b))};var R=o.prototype;if(!F&&J&&x.areHostMethods(G,["removeAllRanges","addRange"])){R.removeAllRanges=function(){this.nativeSelection.removeAllRanges(),g(this)};var S=function(b,c){var d=y.getRangeDocument(c),e=a.createRange(d);e.collapseToPoint(c.endContainer,c.endOffset),b.nativeSelection.addRange(h(e)),b.nativeSelection.extend(c.startContainer,c.startOffset),b.refresh()};R.addRange=L?function(b,c){if(P&&E&&this.docSelection.type==C)n(this,b);else if(c&&K)S(this,b);else{var d;if(M?d=this.rangeCount:(this.removeAllRanges(),d=0),this.nativeSelection.addRange(h(b)),this.rangeCount=this.nativeSelection.rangeCount,this.rangeCount==d+1){if(a.config.checkSelectionRanges){var f=Q(this.nativeSelection,this.rangeCount-1);f&&!y.rangesEqual(f,b)&&(b=new z(f))}this._ranges[this.rangeCount-1]=b,e(this,b,V(this.nativeSelection)),this.isCollapsed=t(this)}else this.refresh()}}:function(a,b){b&&K?S(this,a):(this.nativeSelection.addRange(h(a)),this.refresh())},R.setRanges=function(a){if(P&&a.length>1)p(this,a);else{this.removeAllRanges();for(var b=0,c=a.length;c>b;++b)this.addRange(a[b])}}}else{if(!(x.isHostMethod(G,"empty")&&x.isHostMethod(H,"select")&&P&&F))return b.fail("No means of selecting a Range or TextRange was found"),!1;R.removeAllRanges=function(){try{if(this.docSelection.empty(),"None"!=this.docSelection.type){var a;if(this.anchorNode)a=w.getDocument(this.anchorNode);else if(this.docSelection.type==C){var b=this.docSelection.createRange();b.length&&(a=w.getDocument(b.item(0)).body.createTextRange())}if(a){var c=a.body.createTextRange();c.select(),this.docSelection.empty()}}}catch(d){}g(this)},R.addRange=function(a){this.docSelection.type==C?n(this,a):(z.rangeToTextRange(a).select(),this._ranges[0]=a,this.rangeCount=1,this.isCollapsed=this._ranges[0].collapsed,e(this,a,!1))},R.setRanges=function(a){this.removeAllRanges();var b=a.length;b>1?p(this,a):b&&this.addRange(a[0])}}R.getRangeAt=function(a){if(0>a||a>=this.rangeCount)throw new A("INDEX_SIZE_ERR");return this._ranges[a]};var T;if(F)T=function(b){var c;a.isSelectionValid(b.win)?c=b.docSelection.createRange():(c=w.getBody(b.win.document).createTextRange(),c.collapse(!0)),b.docSelection.type==C?m(b):k(c)?l(b,c):g(b)};else if(x.isHostMethod(G,"getRangeAt")&&"number"==typeof G.rangeCount)T=function(b){if(P&&E&&b.docSelection.type==C)m(b);else if(b._ranges.length=b.rangeCount=b.nativeSelection.rangeCount,b.rangeCount){for(var c=0,d=b.rangeCount;d>c;++c)b._ranges[c]=new a.WrappedRange(b.nativeSelection.getRangeAt(c));e(b,b._ranges[b.rangeCount-1],V(b.nativeSelection)),b.isCollapsed=t(b)}else g(b)};else{if(!J||typeof G.isCollapsed!=u||typeof H.collapsed!=u||!a.features.implementsDomRange)return b.fail("No means of obtaining a Range or TextRange from the user's selection was found"),!1;T=function(a){var b,c=a.nativeSelection;c.anchorNode?(b=Q(c,0),a._ranges=[b],a.rangeCount=1,f(a),a.isCollapsed=t(a)):g(a)}}R.refresh=function(a){var b=a?this._ranges.slice(0):null;if(T(this),a){var c=b.length;if(c!=this._ranges.length)return!1;for(;c--;)if(!y.rangesEqual(b[c],this._ranges[c]))return!1;return!0}};var U=function(a,b){var c=a.getAllRanges(),d=!1;a.removeAllRanges();for(var e=0,f=c.length;f>e;++e)d||b!==c[e]?a.addRange(c[e]):d=!0;a.rangeCount||g(a)};R.removeRange=P?function(a){if(this.docSelection.type==C){for(var b,c=this.docSelection.createRange(),d=j(a),e=w.getDocument(c.item(0)),f=w.getBody(e).createControlRange(),g=!1,h=0,i=c.length;i>h;++h)b=c.item(h),b!==d||g?f.add(c.item(h)):g=!0;f.select(),m(this)}else U(this,a)}:function(a){U(this,a)};var V;!F&&J&&a.features.implementsDomRange?(V=function(a){var b=!1;return a.anchorNode&&(b=1==w.comparePoints(a.anchorNode,a.anchorOffset,a.focusNode,a.focusOffset)),b},R.isBackwards=function(){return V(this)}):V=R.isBackwards=function(){return!1},R.toString=function(){for(var a=[],b=0,c=this.rangeCount;c>b;++b)a[b]=""+this._ranges[b];return a.join("")},R.collapse=function(b,c){q(this,b);var d=a.createRange(w.getDocument(b));d.collapseToPoint(b,c),this.removeAllRanges(),this.addRange(d),this.isCollapsed=!0},R.collapseToStart=function(){if(!this.rangeCount)throw new A("INVALID_STATE_ERR");var a=this._ranges[0];this.collapse(a.startContainer,a.startOffset)},R.collapseToEnd=function(){if(!this.rangeCount)throw new A("INVALID_STATE_ERR");var a=this._ranges[this.rangeCount-1];this.collapse(a.endContainer,a.endOffset)},R.selectAllChildren=function(b){q(this,b);var c=a.createRange(w.getDocument(b));c.selectNodeContents(b),this.removeAllRanges(),this.addRange(c)},R.deleteFromDocument=function(){if(P&&E&&this.docSelection.type==C){for(var a,b=this.docSelection.createRange();b.length;)a=b.item(0),b.remove(a),a.parentNode.removeChild(a);this.refresh()}else if(this.rangeCount){var c=this.getAllRanges();this.removeAllRanges();for(var d=0,e=c.length;e>d;++d)c[d].deleteContents();this.addRange(c[e-1])}},R.getAllRanges=function(){return this._ranges.slice(0)},R.setSingleRange=function(a){this.setRanges([a])},R.containsNode=function(a,b){for(var c=0,d=this._ranges.length;d>c;++c)if(this._ranges[c].containsNode(a,b))return!0;return!1},R.toHtml=function(){var a="";if(this.rangeCount){for(var b=y.getRangeDocument(this._ranges[0]).createElement("div"),c=0,d=this._ranges.length;d>c;++c)b.appendChild(this._ranges[c].cloneContents());a=b.innerHTML}return a},R.getName=function(){return"WrappedSelection"},R.inspect=function(){return r(this)},R.detach=function(){this.win[v]=null,this.win=this.anchorNode=this.focusNode=null},o.inspect=r,a.Selection=o,a.selectionPrototype=R,a.addCreateMissingNativeApiListener(function(b){"undefined"==typeof b.getSelection&&(b.getSelection=function(){return a.getSelection(this)}),b=null})}),
/**
 * @license Selection save and restore module for Rangy.
 * Saves and restores user selections using marker invisible elements in the DOM.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2012, Tim Down
 * Licensed under the MIT license.
 * Version: 1.2.3
 * Build date: 26 February 2012
 */
rangy.createModule("SaveRestore",function(a,b){function c(a,b){return(b||document).getElementById(a)}function d(a,b){var c,d="selectionBoundary_"+ +new Date+"_"+(""+Math.random()).slice(2),e=k.getDocument(a.startContainer),f=a.cloneRange();return f.collapse(b),c=e.createElement("span"),c.id=d,c.style.lineHeight="0",c.style.display="none",c.className="rangySelectionBoundary",c.appendChild(e.createTextNode(l)),f.insertNode(c),f.detach(),c}function e(a,d,e,f){var g=c(e,a);g?(d[f?"setStartBefore":"setEndBefore"](g),g.parentNode.removeChild(g)):b.warn("Marker element has been removed. Cannot restore selection.")}function f(a,b){return b.compareBoundaryPoints(a.START_TO_START,a)}function g(e){e=e||window;var g=e.document;if(!a.isSelectionValid(e))return void b.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");var h,i,j,k=a.getSelection(e),l=k.getAllRanges(),m=[];l.sort(f);for(var n=0,o=l.length;o>n;++n)j=l[n],j.collapsed?(i=d(j,!1),m.push({markerId:i.id,collapsed:!0})):(i=d(j,!1),h=d(j,!0),m[n]={startMarkerId:h.id,endMarkerId:i.id,collapsed:!1,backwards:1==l.length&&k.isBackwards()});for(n=o-1;n>=0;--n)j=l[n],j.collapsed?j.collapseBefore(c(m[n].markerId,g)):(j.setEndBefore(c(m[n].endMarkerId,g)),j.setStartAfter(c(m[n].startMarkerId,g)));return k.setRanges(l),{win:e,doc:g,rangeInfos:m,restored:!1}}function h(d,f){if(!d.restored){for(var g,h,i=d.rangeInfos,j=a.getSelection(d.win),k=[],l=i.length,m=l-1;m>=0;--m){if(g=i[m],h=a.createRange(d.doc),g.collapsed){var n=c(g.markerId,d.doc);if(n){n.style.display="inline";var o=n.previousSibling;o&&3==o.nodeType?(n.parentNode.removeChild(n),h.collapseToPoint(o,o.length)):(h.collapseBefore(n),n.parentNode.removeChild(n))}else b.warn("Marker element has been removed. Cannot restore selection.")}else e(d.doc,h,g.startMarkerId,!0),e(d.doc,h,g.endMarkerId,!1);1==l&&h.normalizeBoundaries(),k[m]=h}1==l&&f&&a.features.selectionHasExtend&&i[0].backwards?(j.removeAllRanges(),j.addRange(k[0],!0)):j.setRanges(k),d.restored=!0}}function i(a,b){var d=c(b,a);d&&d.parentNode.removeChild(d)}function j(a){for(var b,c=a.rangeInfos,d=0,e=c.length;e>d;++d)b=c[d],b.collapsed?i(a.doc,b.markerId):(i(a.doc,b.startMarkerId),i(a.doc,b.endMarkerId))}a.requireModules(["DomUtil","DomRange","WrappedRange"]);var k=a.dom,l="";a.saveSelection=g,a.restoreSelection=h,a.removeMarkerElement=i,a.removeMarkers=j})}({},function(){return this}());
}());
