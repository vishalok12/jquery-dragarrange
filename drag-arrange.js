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
        if (!dragElementsSelector) {
            console.log('Cannot initialize arrangeable without drag elements selector specified!');
            return;
        }

        // Options defaults
        var options = {
            cssPrefix : '',                   // Prefix used for classes added
            containerSelector : '',            // Selector for container when not all draggables share immediate parent as container
            scrollSpeed : 20                   // Number of pixels to move at a time at full speed
        };

        // Override options if provided
        options = $.extend(options, optionsOverrides);

        var dragging = false;                 // Current state
        var $clone;                           // jQuery object being visually dragged around
        var dragElement;                      // DOM element being moved (not the cloned version)
        var $dragElement;                     // jQuery object of the real element being dragged around
        var originalClientX, originalClientY; // Client(X|Y) position before drag starts
        var currentX, currentY;               // The updated (X|Y) position of pointer
        var touchDown = false;                // Flag to note touch start event before movement threshold is reached
        var leftOffset, topOffset;            //
        var $elements = this;                 // List of jQuery object elements to shift between - reload each time to catch dynamic elements

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
        var dragElementDragSelector = (options.dragSelector ? options.dragSelector : dragElementsSelector);
        $container.on(dragEvents.START, dragElementDragSelector, dragStartHandler);
        console.log('Events on: [' + dragElementDragSelector + ']');
        console.log($container);

        function dragStartHandler(e) {
            // Capture mouse down/touchstart event (dragging won't start till threshold is reached)
            touchDown = true;

            // Refresh elements (catch dynamic elements that might be added!)
            $elements = $(dragElementsSelector);

            // stopPropagation is compulsory, otherwise touchmove fires only once (android < 4 issue)
            e.stopPropagation();

            // Turn off browser default scrolling
            $(window).add(document).on(dragEvents.MOVE, killPageScroll);

            originalClientX = currentX = e.pageX;
            originalClientY = currentY = e.pageY;
            dragElement = options.dragSelector ? $(this).parents(dragElementsSelector)[0] : this;
            $dragElement = $(dragElement);

            //autoScrollId = setInterval(autoScroll, 200);
        }

        /*
         * Stop browser from scrolling because it's really frustrating to try to drag something to a new
         * position when the screen scrolls at the same time! We're returning this false value in a handler
         * so we can use the handler name (rather than a namespace) to restore those events later.
         */
        function killPageScroll() {
            return false;
        }

        // Bind mousemove/touchmove to document (as it is not compulsory
        // that event will trigger on the dragging element)
        $(document)
            .on(dragEvents.MOVE, dragMoveHandler)
            .on(dragEvents.END, dragEndHandler);

        function dragMoveHandler(e) {
            if (!touchDown) {
                return;
            } // Defense

            $dragElement.css('touch-action', 'none'); // Tells IE to turn off default touch actions on element so normal events will happen
            var dragDistanceX = e.pageX - originalClientX;
            var dragDistanceY = e.pageY - originalClientY;

            if (dragging) {
                e.stopPropagation();

                $clone.css({
                    left : leftOffset + dragDistanceX,
                    top : topOffset + dragDistanceY
                });

                // Update X,Y position
                currentX = e.pageX;
                currentY = e.pageY;
                autoScroll();

                shiftHoveredElement($elements);

                // Drag hasn't started yet, check threshold
            } else if (
                Math.abs(dragDistanceX) > DRAG_THRESHOLD ||
                Math.abs(dragDistanceY) > DRAG_THRESHOLD) {

                initializeDragging();
            }
        }

        // Move page up or down to expose hidden parts of the container
        function autoScroll() {
            console.log(currentX + ',' + currentY);
            var containerHeight = $container.outerHeight();
            var containerTopPos = $container.offset().top;
            var containerBottomPos = containerTopPos + containerHeight;
            var windowHeight = $(window).height();
            var docOffsetTop = $(document).scrollTop();
            var dragElementHeight = $dragElement.outerHeight();
            var easeFactor = 1;

            // Don't bother if we're not dragging yet or the whole container is in the window
            if (!dragging || (containerTopPos > docOffsetTop && containerBottomPos < windowHeight + docOffsetTop)) {
                return;
            }

            // If the mouse is within the drag elements size distance to upper window
            // AND the top of the container is not in view, scroll proportionally to
            // how close we are to edge of window.
            if (currentY > docOffsetTop && currentY < docOffsetTop + dragElementHeight && docOffsetTop > containerTopPos) {
                easeFactor = (dragElementHeight + docOffsetTop - currentY) / dragElementHeight;
                var scrollDistance = easeFactor * options.scrollSpeed;
                $(document).scrollTop(docOffsetTop - (scrollDistance));
            }

            /* Do the same for the bottom of the container
             * If the mouse is within the drag elements size distance to the bottom edge of
             * the window AND the bottom of the container is not in view, scroll proportionally
             * to how close we are to edge of window.
             */
            if (currentY > docOffsetTop + windowHeight - dragElementHeight && containerBottomPos > docOffsetTop + windowHeight) {
                easeFactor = (docOffsetTop + windowHeight - currentY) / dragElementHeight;
                $(document).scrollTop(docOffsetTop + (options.scrollSpeed * easeFactor));
            }
        }

        function initializeDragging() {
            // Create clone to move around
            clone($dragElement);

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

            //clearInterval(autoScrollId);

            touchDown = false;
        }

        function clone($element) {
            $clone = $element.clone();

            $clone.css({
                position : 'absolute',
                width : $element.width(),
                height : $element.height(),
                'z-index' : 100000 // Very high value to prevent it to hide below other element(s)
            }).addClass(options.cssPrefix + 'dragging');
        }

        /**
         * Find the element on which the dragged element is hovering
         * @return Object hovered over DOM element
         */
        function getHoveredElement() {
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

            for (var i = 0; i < $elements.length; i++) {
                $currentElement = $elements.eq(i);

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

        function shiftHoveredElement() {
            var hoveredElement = getHoveredElement();

            if (hoveredElement !== $dragElement[0]) {
                // shift all other elements to make space for the dragged element
                var hoveredElementIndex = $elements.index(hoveredElement);
                var dragElementIndex = $elements.index($dragElement);
                if (hoveredElementIndex < dragElementIndex) {
                    $(hoveredElement).before($dragElement);
                } else {
                    $(hoveredElement).after($dragElement);
                }

                // since elements order have changed, need to change order in jQuery Object too
                shiftElementPosition(dragElementIndex, hoveredElementIndex);
            }
        }

        function shiftElementPosition(fromIndex, toIndex) {
            var temp = $elements.splice(fromIndex, 1)[0];
            $elements.splice(toIndex, 0, temp);
        }
    };
}));