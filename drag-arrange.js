/**
 * drag-shift
 * http://github.com/vishalok12
 * Copyright (c) 2014 Vishal Kumar
 * Licensed under the MIT License.
 */
'use strict';
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    /**
     * mouse move threshold (in px) until drag action starts
     * @type {Number}
     */
    var DRAG_THRESHOLD = 5;

    /**
     * Javascript events to start dragging, move, and stop dragging. If feature
     * detection is needed, this would be the place to do it, returning an object
     * with these three properties.
     * @return {Object}
     */
    var dragEvents = {
        START : 'mousedown touchstart',
        MOVE : 'mousemove touchmove',
        END : 'mouseup touchend'
    };

    $.fn.arrangeable = function (dragElementsSelector, optionsOverrides) {
        if (! dragElementsSelector) {
            console.log('Cannot initialize arrangeable without drag elements selector specified!');
            return;
        }

        var dragging = false;                 // Current state
        var $clone;                           // jQuery object being visually dragged around
        var dragElement;                      // DOM element being moved (not the cloned version)
        var originalClientX, originalClientY; // Client(X|Y) position before drag starts
        var $elements = this                  // List of jQuery object elements to shift between
        var touchDown = false;                // Flag to note touch start event before movement threshold is reached
        var leftOffset, topOffset;            //

        // Options defaults
        var options = {
            cssPrefix : '',                   // Prefix used for classes added
            containerSelector: ''             // Selector for container when not all draggables share immediate parent as container
        };

        // Override options if provided
        options = $.extend(options, optionsOverrides);

        /* The DOM element that contains all sortable elements ($elements) for group.
         * Will default to parent of first element, but can be overridden by providing
         * a selector in the function call options object:
         * $('.draggable-items').arrangeable('.draggable-items',{containerSelector: '.container'});
         * This is especially important when not all draggable items are in the
         * same immediate parent container. Knowing the common parent allows the
         * auto scroll functionality to work!
         */
        var $container = options.containerSelector ? $(options.containerSelector) : $($elements[0]).parent();

        // Attach handler at container level to allow for dynamic element addition!
        var dragElementDragSelector = (options.dragSelector ? options.dragSelector: dragElementsSelector);
        $container.on(dragEvents.START, dragElementDragSelector, dragStartHandler);
        console.log('Events on: [' + dragElementDragSelector + ']');
        console.log($container);

        function dragStartHandler(e) {
            // Capture mouse down/touchstart event (dragging won't start till threshold is reached)
            touchDown = true;

            // stopPropagation is compulsory, otherwise touchmove fires only once (android < 4 issue)
            e.stopPropagation();

            // Turn off browser default scrolling
            $(window).add(document).on(dragEvents.MOVE, killPageScroll);

            originalClientX = e.clientX || e.originalEvent.touches[0].clientX;
            originalClientY = e.clientY || e.originalEvent.touches[0].clientY;
            dragElement = options.dragSelector ? $(this).parents(dragElementsSelector)[0] : this;
        }

        /*
         * Stop browser from scrolling because it's really frustrating to try to drag something to a new
         * position when the screen scrolls at the same time! We're returning this false value in a handler
         * so we can use the handler name (rather than a namespace) to restore those events later.
         */
        function killPageScroll() {
            return false;
        }

        // Bind mousemove/touchmove to document
        // (as it is not compulsory that event will trigger on the dragging element)
        $(document)
            .on(dragEvents.MOVE, dragMoveHandler)
            .on(dragEvents.END, dragEndHandler);

        function dragMoveHandler(e) {
            if (!touchDown) {
                return;
            } // Defense

            var $dragElement = $(dragElement);
            $dragElement.css('touch-action', 'none'); // Tells IE to turn off default touch actions on element so normal events will happen
            var dragDistanceX = (e.clientX || e.originalEvent.touches[0].clientX) - originalClientX;
            var dragDistanceY = (e.clientY || e.originalEvent.touches[0].clientY) - originalClientY;

            if (dragging) {
                e.stopPropagation();

                $clone.css({
                    left : leftOffset + dragDistanceX,
                    top : topOffset + dragDistanceY
                });

                autoScroll();

                shiftHoveredElement($clone, $dragElement, $elements);

                // Drag hasn't started yet, check threshold
            } else if (
                Math.abs(dragDistanceX) > DRAG_THRESHOLD ||
                Math.abs(dragDistanceY) > DRAG_THRESHOLD) {

                initializeDragging($dragElement);
            }
        }

        // Move page up or down to expose hidden parts of the container
        function autoScroll() {

        }

        function initializeDragging($dragElement) {
            // Create clone to move around
            $clone = clone($dragElement);

            // Initialize left and top offset to be used in successive calls of this function
            leftOffset = dragElement.offsetLeft - parseInt($dragElement.css('margin-left')) -
                parseInt($dragElement.css('padding-left'));
            topOffset = dragElement.offsetTop - parseInt($dragElement.css('margin-top')) -
                parseInt($dragElement.css('padding-top'));

            // put cloned element just above the dragged element
            // and move it instead of original element
            $clone.css({
                left : leftOffset,
                top : topOffset
            });
            $dragElement.parent().append($clone);

            // Hide original dragged element
            $dragElement.css('visibility', 'hidden');

            dragging = true;
        }

        function dragEndHandler(e) {
            if (dragging) {
                // Remove the cloned dragged element and show original
                e.stopPropagation();
                dragging = false;
                $clone.remove();
                dragElement.style.visibility = 'visible';

                // Resume normal page scroll
                $(window).add(document).off(dragEvents.MOVE, killPageScroll);
            }

            touchDown = false;
        }

        function clone($element) {
            var $clone = $element.clone();

            $clone.css({
                position : 'absolute',
                width : $element.width(),
                height : $element.height(),
                'z-index' : 100000 // Very high value to prevent it to hide below other element(s)
            }).addClass(options.cssPrefix + 'dragging');

            return $clone;
        }

        /**
         * Find the element on which the dragged element is hovering
         * @return Object hovered over DOM element
         */
        function getHoveredElement($clone, $dragElement, $movableElements) {
            var cloneOffset = $clone.offset();
            var cloneWidth = $clone.width();
            var cloneHeight = $clone.height();
            var cloneLeftPosition = cloneOffset.left;
            var cloneRightPosition = cloneOffset.left + cloneWidth;
            var cloneTopPosition = cloneOffset.top;
            var cloneBottomPosition = cloneOffset.top + cloneHeight;
            var $currentElement;
            var horizontalMidPosition, verticalMidPosition;
            var offset, overlappingX, overlappingY, inRange;

            for (var i = 0; i < $movableElements.length; i++) {
                $currentElement = $movableElements.eq(i);

                if ($currentElement[0] === $dragElement[0]) {
                    continue;
                }

                offset = $currentElement.offset();

                // current element width and draggable element(clone) width or height can be different
                horizontalMidPosition = offset.left + 0.5 * $currentElement.width();
                verticalMidPosition = offset.top + 0.5 * $currentElement.height();

                // check if this element position is overlapping with dragged element
                overlappingX = (horizontalMidPosition < cloneRightPosition) &&
                    (horizontalMidPosition > cloneLeftPosition);

                overlappingY = (verticalMidPosition < cloneBottomPosition) &&
                    (verticalMidPosition > cloneTopPosition);

                inRange = overlappingX && overlappingY;

                if (inRange) {
                    return $currentElement[0];
                }
            }
        }

        function shiftHoveredElement($clone, $dragElement, $movableElements) {
            var hoveredElement = getHoveredElement($clone, $dragElement, $movableElements);

            if (hoveredElement !== $dragElement[0]) {
                // shift all other elements to make space for the dragged element
                var hoveredElementIndex = $movableElements.index(hoveredElement);
                var dragElementIndex = $movableElements.index($dragElement);
                if (hoveredElementIndex < dragElementIndex) {
                    $(hoveredElement).before($dragElement);
                } else {
                    $(hoveredElement).after($dragElement);
                }

                // since elements order have changed, need to change order in jQuery Object too
                shiftElementPosition($movableElements, dragElementIndex, hoveredElementIndex);
            }
        }

        function shiftElementPosition(arr, fromIndex, toIndex) {
            var temp = arr.splice(fromIndex, 1)[0];
            return arr.splice(toIndex, 0, temp);
        }
    };

}));
