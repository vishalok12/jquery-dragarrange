#jquery-dragarrange
### A very basic jQuery plugin to shift element position by drag

If you are looking for a library which can be ordered/arranged by drag, you are at right place. This plugin doesn't require any CSS change, just call the function on elements you want to be arranged, and you are done.

How to Use
----------
```html
<div id="elements-container">
  <div class="draggable-element d-1">Drag 1</div>
  <div class="draggable-element d-2">Drag 2</div>
  <div class="draggable-element d-3">Drag 3</div>
  <div class="draggable-element d-4">Drag 4</div>
</div>
```
Call the function:
$('.draggable-element').arrangeable();

Optional Parameters
-------------------
###dragSelector
If passed, object can be dragged only from this selector. The default dragSelector is same DOM element that has called the function.

Destroy drag arrange
--------------------
$('.draggable-element').arrangeable('destroy');

###Demo
TODO

### License
Dragarrange is licensed under the [MIT license](http://opensource.org/licenses/MIT).
Copyright (c) 2014 [Vishal Kumar](http://github.com/vishalok12)

