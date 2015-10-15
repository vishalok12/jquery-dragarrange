#jquery-dragarrange
### A jQuery plugin to shift element position by drag & drop

If you are looking for a library which can be ordered/arranged by drag, you are at right place. 
This plugin doesn't require any CSS change, just call the function on elements you want to be arranged, and you are done.
The intent of the plugin is to:

* Allow easy drag and drop reordering of elements within a container
* Allow for elements added dynamically to also be sortable
* Automatically scroll when reaching window border for long lists

How to Use
----------
```html
<div id="elements-container">
  <div class="draggable-element">Drag 1</div>
  <div class="draggable-element">Drag 2</div>
  <div class="draggable-element">Drag 3</div>
  <div class="draggable-element">Drag 4</div>
</div>
```
Call the function:
```javascript
$('.draggable-element').dragArrange('.draggable-element');
```
Note that the selector is provided twice: once as a jQuery selector, and once as a dragArrange argument. 
This may seem redundant. However, the selector is used internally and since [jQuery has deprecated the .selector property](http://api.jquery.com/selector/),
this was a low friction way of accessing the data reliably.

Optional Parameters
-------------------
###cssPrefix
String to be prepended to the default "dragging" class assigned to any actively dragging DOM element.

###containerSelector
jQuery selector to define the single parent over all draggable element containers that should behave together.

###dragSelector
jQuery selector of element within a draggable element to be used as the drag handle. If not set, the entire draggable
element acts as the handle.

###Setup
```
bower install jquery-dragarrange
```
Or you can download latest library from [here](https://github.com/vishalok12/jquery-dragarrange/releases).

###Demo
http://vishalok12.github.io/jquery-dragarrange/

### License
Dragarrange is licensed under the [MIT license](http://opensource.org/licenses/MIT).
Copyright (c) 2014 [Vishal Kumar](http://github.com/vishalok12)
