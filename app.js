// READ THIS BEFORE WRITING ANY MORE CODE: http://documentcloud.github.com/backbone/docs/todos.html
// http://documentcloud.github.com/backbone/examples/todos/index.html

// other examples:
// http://coenraets.org/blog/2011/12/backbone-js-wine-cellar-tutorial-part-1-getting-started/
// http://www.quora.com/What-are-some-good-resources-for-Backbone-js

//TODO - figure out how to render list in reverse! :'(

var Task = Backbone.Model.extend({
    defaults: function() {
        return {
            active: true,
            text: '',
            i: tasks.nextOrder()
        };
    },
    initialize: function() {
        console.log('[init] Task', this.get('i')); //REM
        // if (!this.get('text')) {
        //     this.set({'text': this.defaults.text});
        // }
        this.bind('change:text', function() {
            console.log('[change:text] now: ' + this.get('text'));
        });
    },
    toggle: function() {
        this.save({active: !this.get('active')});
    },
    clear: function() {
        this.destroy();
    }
    // validate: function(attrs) {
    //     if (attrs.text.length == 0) {
    //         return 'Must enter text!';
    //     }
    //     return undefined;
    // }
});

var TaskList = Backbone.Collection.extend({
    model: Task,

    localStorage: new Store('stack-backbone'),

    active: function() {
        return this.filter(function(task) { return task.get('active'); });
    },
    inactive: function() {
        return this.without.apply(this, this.active());
    },

    nextOrder: function() {
        if (!this.length) return 1;
        return this.last().get('i') + 1;
    },

    comparator: function(task1, task2) {
        console.log('task', task1, 'i', task1.get('i')); //REM
        return task1.get('i') - task2.get('i');
    },

    initialize: function() {
        console.log('[init] TaskList');
        this.bind('remove', this.onRemove, this);
    },

    onRemove: function() {
        console.log('onRemove!', this); //REM
        _.each(this.models, function(model, i) {
            model.set('i', i+1);
        });
    }
});

var tasks = new TaskList;

var TaskView = Backbone.View.extend({
    className: 'box',

    template: _.template($('#template-box').html()),

    events: {
        'click a.pop': 'pop',
        'click div.text': 'edit',
        'keydown div.text': 'edit',
        'focus a.pop': 'popFocus',
        'keydown .edit': 'updateOnEnterOrEsc',
        'blur .edit': 'close'
    },

    initialize: function() {
        this.model.bind('change', this.render, this);
        this.model.bind('destroy', this.remove, this);
        this.model.bind('edit', this.edit, this);
        this.$window = $(window);
        this.$header = $('#header');
    },

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.toggleClass('active', this.model.get('active'));
        this.$input = this.$('.edit');
        return this;
    },

    pop: function() {
        this.clear();
    },

    popFocus: function(e) {
        var scrollTop = this.$window.scrollTop(),
            headerHeight = this.$header.outerHeight(),
            elTop = this.$el.offset().top,
            extraPadding = 20;
        if (elTop < scrollTop + headerHeight) {
            window.scrollTo(this.$window.scrollLeft(), eltTop - headerHeight - 20);
        }
    },

    edit: function(e) {
        if (e && e.type != 'click' && e.keyCode != 13) return;
        this.$input.val(this.model.get('text'));
        this.$el.addClass('editing');
        this.$input.focus().select();
        this.$el.siblings('.selected').removeClass('selected'); //TODO - i'm doing this wrong? DRY
        this.$el.addClass('selected'); //TODO - i'm doing this wrong? DRY
    },

    close: function(e, wasEscape) {
        console.log("[CLOSE]", wasEscape); //REM
        if (!wasEscape || !this.model.get('text')) {
            var value = this.$input.val();
            if (!value) this.clear();
            else this.model.save({text: value});
        }
        this.$el.removeClass('editing');
    },

    updateOnEnterOrEsc: function(e) {
        if (e.keyCode == 13) this.close(e); // enter
        else if (e.keyCode == 27) this.close(e, true); // esc
    },

    clear: function() {
        $('#under>.inner').prepend(this.$el.parent().html());
        this.model.clear();
    }
});


var AppView = Backbone.View.extend({
    el: $('body'), //TODO - I have el here and this.$el in initialize... dupes?

    events: {
        'click a.add': 'addNew',
        'click #clear-inactive': 'clearInactive',
        'click #pop-all': 'popAll'
    },

    initialize: function() {
        this.$add = $('#header').find('a.add');
        this.$el = $('body');
        //TODO - #pop-all, #clear-inactive

        tasks.bind('add', this.addOne, this); //TODO - can these be chained?
        tasks.bind('reset', this.addAll, this);
        tasks.bind('change', this.render, this);
        tasks.bind('all', this.render, this);
        tasks.fetch();

        var self = this, $tasks = self.$('#tasks');
        function next(prev) {
            var $selected = $tasks.find('.box.selected').removeClass('selected').first();
            ($selected.length ? $selected[prev?'prev':'next']('.box') : $tasks.find('.box').first()).addClass('selected');
        }

        //TODO - feels like I'm doing it wrong...
        var keyevents,
            helpTemplate = _.template($('#template-help').html());

        function hideHelp() {
            var m = document.getElementById('hotkey-modal');
            if (m) {
                $(m).remove();
                return true;
            }
            return false;
        }

        function help() {
            if (!hideHelp()) {
                var html = helpTemplate({keyevents: keyevents});
                console.log('HTML', html); //REM
                $('body').append(html);
            }
        }

        keyevents = [
            {
                evt: 'keyup',
                key: 'a',
                fn: function() { self.addNew(); },
                help: 'Add a new task'
            },
            {
                evt: 'keypress',
                key: 'j',
                fn: function() { next(); },
                help: 'Select the next task'
            },
            {
                evt: 'keypress',
                key: 'k',
                fn: function() { next(true); },
                help: 'Select the previous task'
            },
            {
                evt: 'keyup',
                key: 'e',
                fn: function() {
                    $tasks.find('.box.selected').find('div.text').click();
                },
                help: 'Edit the selected task'
            },
            {
                evt: 'keyup',
                key: '#',
                fn: function() {
                    var $cur = $tasks.find('.box.selected');
                    next();
                    $cur.find('a.pop').click();
                },
                help: 'Mark the current task as complete'
            },
            {
                evt: 'keyup',
                key: 'shift+/',
                fn: help,
                help: 'Show the help modal'
            }
        ];

        var $doc = $(document);

        _.each(keyevents, function(obj) {
            $doc.bind(obj.evt, obj.key, obj.fn);
        });

        $doc.bind('keyup', 'esc', hideHelp);
    },

    render: function() {
        var numActive = tasks.active().length,
            numInactive = tasks.inactive().length;

        console.log('[APPVIEW.RENDER]'); //REM

        //tasks.render();

        var numModels = tasks.models.length;
        _.each(tasks.models, function(model, i) {
            var mI = model.get('i');
            console.log('model', mI, i, model); //REM
        });

        if (tasks.length) {
            //TODO
        } else {
            //TODO
        }
    },

    // updateNums: function() {
    //     _.each([tasks.active(), tasks.inactive()], function(tasks) {
    //         _.each(tasks, function(x, i) { x.save({i: i}); });
    //     });
    // },

    addOne: function(task) {
        console.log('[APPVIEW.ADDONE]', task, 'PLUCK', tasks.pluck('i')); //REM
        var view = new TaskView({model: task});
        this.$('#tasks').prepend(view.render().el);
    },

    addAll: function() {
        tasks.each(this.addOne);
    },

    addNew: function(e) {
        console.log('[APPVIEW.ADDNEW]', e); //REM
        window.scrollTo(0, 0);
        var task = tasks.create();
        task.trigger('edit');
    },

    clearInactive: function() {
        _.each(tasks.inactive(), function(task) {
            task.clear();
        });
        return false;
    },

    popAll: function() {
        tasks.each(function(task) { task.save({'active': false}); });
    }
});

var app = new AppView;
