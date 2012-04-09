//  Copyright (C) 2012 Jason Morrison
//
//  All Rights Reserved.
//
//----------------------------------------------------------------------------

//============================================================================
// Teacher
//============================================================================

(function() {

  function Lesson() {
    this.frames = [];
    this.frameIndex = 0;
  };

  Lesson.CLICK = 'Advance by clicking "Next".';

  Lesson.prototype.currentFrame = function() {
    return this.frames[this.frameIndex];
  };

  Lesson.prototype.advance = function() {
    this.frameIndex += 1;
  };

  function TeacherView(options) {
    options = options || {};

    this.lesson = options.lesson;
    this.lessonFrame = 0;
  };

  TeacherView.prototype.inject = function() {
    this.el = $('<div id="teacher"></div>');
    this.el.addClass("vbox ui-widget-content ui-corner-all cell border-box-sizing");

    $('div#main_app').prepend(this.el);

    $('div#notebook_panel').css({
      'float': 'right',
      'width': '960px',
    });
  };

  TeacherView.prototype.render = function() {
    if (this.frameView) {
      this.frameView.leave();
    }

    this.frameView = new FrameView(this.lesson.currentFrame(), this);
    this.frameView.render();

    this.el.html(this.frameView.el);
  };

  TeacherView.prototype.advance = function() {
    this.lesson.advance();
    this.render();
  };

  function FrameView(frame, container) {
    this.frame = frame;
    this.container = container;
  };

  FrameView.prototype.render = function() {
    console.log("Rendering FrameView for frame:");
    console.log(this.frame);

    if (this.frame.beforeRender) {
      this.frame.beforeRender();
    }

    var that = this;
    this.el = $('<div class="lesson_frame"></div>');

    if (this.frame === undefined) {
      this.el.html('(Lesson complete.)');
      return;
    }

    this.el.html(this.frame.content);

    // Highlight
    this.el.find('.code').each(function(i, element) {
      $(element).addClass('CodeMirror cm-s-default');
      var code = $(element).text();
      console.log("highlighting: <<" + code + ">> into " + element);
      CodeMirror.runMode(code, "python", element);
    });

    if (this.frame.advance === Lesson.CLICK) {
      var nextLink = $('<a class="next" href="#">Next &rarr;</a>');
      this.el.append(nextLink);
      // TODO: Refactor to emitting an event
      nextLink.click(function(e) {
        e.preventDefault();
        that.container.advance();
      });
    }

    this.pollInterval = setInterval(function() {
      var cell = IPython.notebook.get_cell(0);

      if (cell && that.frame.advance) {
        var code = cell.get_text();
        if (that.frame.advance.input && code === that.frame.advance.input) {
          that.container.advance();
        }

        var output = cell.outputs[0] && cell.outputs[0].text;
        if (output && that.frame.advance.output) {
          if (_.isRegExp(that.frame.advance.output) && output.match(that.frame.advance.output)) {
            console.log('matched on regex');
            that.container.advance();
          } else if (output === that.frame.advance.output) {
            console.log('matched on streq');
            that.container.advance();
          }
        }
      }
    }, 500);
  };

  FrameView.prototype.leave = function() {
    this.el.remove();
    clearInterval(this.pollInterval);
  };

  // This lesson ==========================================

  var lesson = new Lesson();

  lesson.frames.push({
    beforeRender: function() {
      IPython.notebook.delete_cell(0);
    },
    content: 'Welcome to the IPython interactive tutor.  Click "Next" to advance to the next slide.',
    advance: Lesson.CLICK
  });

  lesson.frames.push({
    beforeRender: function() {
      IPython.notebook.insert_cell_above('code', 0);
    },
    content: 'Now, type <span class="code">print 5 + 5</span> into the prompt on your right, next to the <pre>In [ ]:</pre> prompt:',
    advance: { input: 'print 5 + 5' }
  });

  lesson.frames.push({
    content: 'Next, press <pre>[Control]</pre> + <pre>[Return]</pre> to run your code.',
    advance: { output: /10/ }
  });

  lesson.frames.push({
    content: "Ok, great!  That's it for this lesson.",
  });

  // TODO: Refactor to: TeacherView contains LessonView
  var teacherView = new TeacherView({ lesson: lesson });

  $([IPython.events]).on('notebook_loaded.Notebook', function() {
    teacherView.inject();
    teacherView.render();
  })

})();
