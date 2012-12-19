
// backbone examples:
// http://documentcloud.github.com/backbone/docs/todos.html
// http://documentcloud.github.com/backbone/examples/todos/index.html
// http://coenraets.org/blog/2011/12/backbone-js-wine-cellar-tutorial-part-1-getting-started/
// http://www.quora.com/What-are-some-good-resources-for-Backbone-js

function log() {
    return;
    try {
        console.log.apply(console, arguments);
    } catch(e) {}
}


var Task = Backbone.Model.extend({
    defaults: function() {
        return {
            active: true,
            text: '',
            i: tasks.nextOrder()
        };
    },
    initialize: function() {
        log('[init] Task', this.get('i'));
        // if (!this.get('text')) {
        //     this.set({'text': this.defaults.text});
        // }
        this.bind('change:text', function() {
            log('[change:text] now: ' + this.get('text'));
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
        log('task', task1, 'i', task1.get('i'));
        return task1.get('i') - task2.get('i');
    },

    initialize: function() {
        log('[init] TaskList');
        this.bind('remove', this.onRemove, this);
    },

    onRemove: function() {
        log('onRemove!', this);
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
        'blur .edit': 'close',
        'makeSelected': 'makeSelected',
        'hover': 'makeSelected'
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

    makeSelected: function() {
        this.$el.siblings('.selected').removeClass('selected');
        this.$el.addClass('selected');
    },

    edit: function(e) {
        if (e && e.type != 'click' && e.keyCode != 13) return;
        this.$input.val(this.model.get('text'));
        this.$el.addClass('editing');
        this.makeSelected();
        this.$input.focus().select();
    },

    close: function(e, wasEscape) {
        log("[CLOSE]", wasEscape);
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
        log('[TaskView.clear]');
        if (this.model.get('text')) {
            $('<div>', {
                'class': 'box',
                html: this.$el.html()
            }).prependTo('#under>.inner');
        }
        this.model.clear();
    }
});


var AppView = Backbone.View.extend({
    el: $('body')[0],

    events: {
        'click a.add': 'addNew',
        'click #clear-inactive': 'clearInactive',
        'click #pop-all': 'popAll'
    },

    initialize: function() {
        tasks.bind('add', this.addOne, this); //TODO - can these be chained?
        tasks.bind('reset', this.addAll, this);
        tasks.bind('change', this.render, this);
        tasks.bind('all', this.render, this);
        tasks.fetch();

        var self = this, $tasks = self.$('#tasks');
        function next(prev) {
            var $selected = $tasks.find('.box.selected').first(),
                $new = ($selected.length ?
                        $selected[prev?'prev':'next']('.box') :
                        null);
            if (!$new || !$new.size()) {
                $new = $tasks.find('.box')[prev?'last':'first']();
            }
            $new.trigger('makeSelected');
        }

        // key events
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
                $('body').append(html);
            }
        }

        keyevents = [
            {
                evt: 'keyup',
                key: 'a',
                fn: function(e) {
                    // note - there's a mysterious bug where
                    // this gets triggered sometimes on firefox
                    // on mac osx when using cmd+tab to switch
                    // applications...
                    self.addNew();
                },
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
                key: '?',
                exactKey: 'shift+/',
                fn: help,
                help: 'Show the help modal'
            }
        ];

        var $doc = $(document);

        _.each(keyevents, function(obj) {
            $doc.bind(obj.evt, obj.exactKey || obj.key, obj.fn);
        });

        $doc.bind('keyup', 'esc', hideHelp);
    },

    render: function() {
        var numActive = tasks.active().length,
            numInactive = tasks.inactive().length;

        log('[APPVIEW.RENDER]');

        //tasks.render();

        var numModels = tasks.models.length;
        _.each(tasks.models, function(model, i) {
            var mI = model.get('i');
            log('model', mI, i, model);
        });

        if (tasks.length) {
            $('#add-helper').hide();
        } else {
            $('#add-helper').show();
        }
    },

    addOne: function(task, i) {
        log('[APPVIEW.ADDONE]', task, i, 'PLUCK', tasks.pluck('i'));
        if (typeof(i) == 'number' && task.get('i') != i) {
            task.set('i', i);
        }
        var view = new TaskView({model: task});
        this.$('#tasks').prepend(view.render().el);
    },

    addAll: function() {
        log('[APPVIEW.ADDALL]');
        var self = this;
        tasks.each(function(task, i) {
            self.addOne(task, i+1);
        });
    },

    addNew: function(e) {
        log('[APPVIEW.ADDNEW]', e);
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
        log('[AppView.popAll]');
        tasks.each(function(task) {
            task.save({'active': false});
        });
    }
});

var app = new AppView;
