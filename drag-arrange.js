/**
 * drag-arrange
 * http://github.com/vishalok12
 * Copyright (c) 2014 Vishal Kumar; 2015 Jared Carlow
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

    $.fn.dragArrange = function (dragElementsSelector, optionsOverrides) {
        if (!dragElementsSelector) {
            console.log('Cannot initialize arrangeable without drag elements selector specified!');
            return;
        }

        // Options defaults
        var options = {
            cssPrefix : '',                   // Prefix used for classes added
            containerSelector : '',            // Selector for container when not all draggable items share immediate parent as container
            scrollSpeed : 15                   // Number of pixels to move at a time at full speed
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
        var leftOffset, topOffset;            // CSS left and top property distance of dragging element
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
        var dragElementDragSelector = (options.dragSelector ? options.dragSelector : separateElementsSelectorFromContainer());

        $container.on(dragEvents.START, dragElementDragSelector, dragStartHandler);

        // Bind mousemove/touchmove to document (as it is not compulsory
        // that event will trigger on the dragging element)
        $(document).add(window)
            .on(dragEvents.MOVE, dragMoveHandler)
            .on(dragEvents.END, dragEndHandler);

        /* In order to detect dynamic elements, we need to bind events to their container so when
         * they bubble up they can be noticed. In order to detect the events properly, we need to filter the events.
         * This is done by applying a selector filter. The filter selector CANNOT contain pieces of the
         * container selector or it won't recognize it. So for example, if we have:         *
         * $('ul.container li.dragElement').dragArrange('ul.container li.dragElement');
         * The plugin will bind events to the ('ul.container') element and need to filter by ('li.dragElement').
         * If it tries to filter by ('ul.container li.dragElement') it will fail, because of course the <ul>
         * doesn't have another <ul> in it. This function separates the selector pieces of the container out so the
         * filter will work. This is done because the .selector property has been deprecated from jQuery (see
         * http://api.jquery.com/selector/).
         */
        function separateElementsSelectorFromContainer() {
            var elementSelectorPieces = dragElementsSelector.split(' ');
            var containerSelectorPieces = [];
            for (var i = 0; i < elementSelectorPieces.length; i++) {
                if ($container.is(elementSelectorPieces[i])) {
                    containerSelectorPieces.push(elementSelectorPieces[i]);
                    continue;
                }
                break;
            }
            var containerSelector = containerSelectorPieces.join(' ');
            return dragElementsSelector.replace(containerSelector, '').trim();
        }

        function dragStartHandler(e) {
            // Capture mouse down/touchstart event (dragging won't start till threshold is reached)
            touchDown = true;

            // Refresh elements (catch dynamic elements that might be added!)
            $elements = $(dragElementsSelector);

            // stopPropagation is compulsory, otherwise touchmove fires only once (android < 4 issue)
            e.stopPropagation();

            // Turn off browser default scrolling
            $(window).add(document).on(dragEvents.MOVE, killPageScroll);

            // Set current and initial touch spot relative to document (not window)
            var eventCoords = getDocumentCoordinatesForEvent(e);
            originalClientX = currentX = eventCoords.x;
            originalClientY = currentY = eventCoords.y;
            dragElement = options.dragSelector ? $(this).parents(dragElementsSelector)[0] : this;
            $dragElement = $(dragElement);

            initializeDragging();
        }

        function getDocumentCoordinatesForEvent(event) {
            // If we have pageX and pageY, then we don't really need any more calculations!
            if (event.pageX) {
                return {
                    x : event.pageX,
                    y : event.pageY
                };
            }
            // Otherwise, we have to look a few places and add the window position to scrolled positoin
            else {
                var windowX = event.clientX || event.originalEvent.touches[0].clientX;
                var windowY = event.clientY || event.originalEvent.touches[0].clientY;
                return {
                    x : windowX, // TODO: account for horizontal scroll!
                    y : windowY + $(document).scrollTop()
                };
            }
        }

        /*
         * Stop browser from scrolling because it's really frustrating to try to drag something to a new
         * position when the screen scrolls at the same time! We're returning this false value in a handler
         * so we can use the handler name (rather than a namespace) to restore those events later.
         */
        function killPageScroll() {
            return false;
        }

        function dragMoveHandler(e) {
            if (!touchDown) {
                return;
            } // Defense

            $dragElement.css('touch-action', 'none'); // Tells IE to turn off default touch actions on element so normal events will happen
            var eventCoordinates = getDocumentCoordinatesForEvent(e);
            var dragDistanceX = eventCoordinates.x - originalClientX;
            var dragDistanceY = eventCoordinates.y - originalClientY;

            if (dragging) {
                e.stopPropagation();

                $clone.css({
                    left : leftOffset + dragDistanceX,
                    top : topOffset + dragDistanceY
                });

                // Update X,Y position
                currentX = eventCoordinates.x;
                currentY = eventCoordinates.y;

                autoScroll();
                shiftHoveredElement();

                // Drag hasn't started yet, check threshold
            } else if (
                Math.abs(dragDistanceX) > DRAG_THRESHOLD ||
                Math.abs(dragDistanceY) > DRAG_THRESHOLD) {

                initializeDragging();
            }
        }

        // Move page up or down to expose hidden parts of the container
        function autoScroll() {
            var containerTopPos = $container.offset().top;
            var docOffsetTop = $(document).scrollTop();
            var containerHeight = $container.outerHeight();
            var containerBottomPos = containerTopPos + containerHeight;
            var windowHeight = $(window).height();

            // Don't bother if we're not dragging yet or the whole container is in the window
            if (!dragging || (containerTopPos > docOffsetTop && containerBottomPos < windowHeight + docOffsetTop)) {
                return;
            }

            // Determine scroll zone height is the smaller of: height of the dragged item or 25% of window height
            var dragElementHeight = $dragElement.outerHeight();
            var scrollZoneHeight = Math.min(dragElementHeight, windowHeight/4);

            // If the mouse is within the upper window scroll zone AND the top of the container
            // is not in view, scroll proportionally to how close we are to edge of window.
            if (currentY < docOffsetTop + scrollZoneHeight &&
                docOffsetTop > containerTopPos) {
                $(document).scrollTop(docOffsetTop - (options.scrollSpeed));
            }

            // Do the same for the bottom scroll zone
            if (currentY > docOffsetTop + windowHeight - scrollZoneHeight &&
                containerBottomPos > docOffsetTop + windowHeight) {
                $(document).scrollTop(docOffsetTop + (options.scrollSpeed));
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
            }

            // Resume normal page scroll
            $(window).add(document).off(dragEvents.MOVE, killPageScroll);

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