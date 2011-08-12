/**
 * jQuery.ellipterrific.js
 *
 * Author: Peter Snyder – snyderp@gmail.com
 * Version: 0.4
 * Date: 08/01/2011
 *
 * Simple jQuery plugin to trim text to fill a given space and make it end with …
 *
 * To use, first size your element with the maximum size the text should take up
 * in CSS (ex height, width), and set it to have the overflow be hidden.  This makes
 * sure that we degrade smoothly, since non-js agents will see the element laid out
 * correctly, but with the text clipped.
 *
 * The general strategy is calculate the largest amount of text that will fit in the element by
 * drawing the text in the element, looking to see if the text overflows the container, and
 * if so, reducing the number of words, redrawing the text, and trying again.  This can be very
 * slow though, so use a binary search to minimize the number of draw / measure / redraw cycles
 * we have to go through.
 *
 * This plugin came out of an effort to get the CSS3 text-overflow: property to
 * act the way I, expected it to, which is to not require all text to be on a single
 * line before acting on it.
 *
 * Inspiration for this plugin came from jquery.ThreeDots.js, which seemed useful
 * but which required a lot more markup and being able to predict the number
 * of rows of text you wanted to appear in an element, instead of being able
 * to calculate it itself.
 */
(function ($) {

    $.fn.ellipterrific = function (options) {

        var configured_options = $.extend({}, $.fn.ellipterrific.settings, options),
            are_words_fitting_in_element,
            index_for_best_fit;

        /**
         * Returns a boolean description of whether the given element can contain
         * all the elements in the array of words (which may either be words or characters),
         * plus the ellipsis character without overflowing.  The element is modified in this
         * funciton, but its state is restored to its initial state before the function
         * returns controll.
         *
         * - element (HTMLElement)  The DOM element to fill and test text for
         * - words (Array)          An array of character elements.  Depending on the current
         *                          configuration of the plugin, this will either be a collection
         *                          of words or individual characters
         */
        are_words_fitting_in_element = function (element, words) {

            /**
            * $element (jQuery) A jQuery wrapped version of the current element
            *                  we're about to test against
            * initial_text (string)   The initial text of the element, used to roll things
            *                         back to their initial state if something odd happens
            * initial_height (int) the height and width the elment as it has been sized
            * initial_width (int)  with CSS and agent defaults.   The goal of the below
            *                      processing will be to get the largest amount of text
            *                      possible that will fit in the the above space
            * are_words_overflowing (boolean)  will contain the boolean state of
            *                                  whether the element is overflowing when filled
            *                                  with the provided text
            */
            var $element = $(element),
                initial_text = $(element).text(),
                intitial_height = $element.innerHeight(),
                initial_width = $element.innerWidth(),
                are_words_overflowing;

            if (configured_options.split_on_words) {

                $element.text(words.join(" ") + configured_options.ellipsis_string);

            } else {

                $element.text($.trim(words.join("")) + configured_options.ellipsis_string);

            }

            are_words_overflowing = (element.scrollHeight > intitial_height || element.scrollWidth > initial_width);

            $element.text(initial_text);
            return are_words_overflowing;
        };

        /**
         * Perform a binary search to find the word or character seperator where we're not
         * overflowing, but including any more words / characters would cause the text to overflow.
         * Will return the index of the last word to include.  Will return -1 on error.
         *
         * element (HTMLElement)  The DOM element we're trying to maximally fill with text.
         * words (Array)          An array of either words or characters, depening on the
         *                        current configuration of the plugin.
         * guess (int)            The current guess for which index in the set of words
         *                        will maximally fill the array.  Defaults to the midpoint
         *                        though future recursions will result in different values
         *                        being automatically used here.
         * low_bound (int)        The lowest index in the "words" array thats still in play
         *                        (ie that hasn't been ruled out already).  Defaults to 0.
         * high_bound (int)       The highest index in the "words" array thats still in play
         *                        (ie that hasn't been ruled out already).  Defaults to the last
         *                        index of the array.
         */
        index_for_best_fit = function (element, words, guess, low_bound, high_bound) {

            var is_midpoint_overflowing,
                is_above_midpoint_overflowing,
                mid;

            if (low_bound === undefined) {
                low_bound = 0;
            }

            if (high_bound === undefined) {
                high_bound = words.length - 1;
            }

            if (high_bound < low_bound) {

                return -1;

            } else {

                mid = Math.ceil(low_bound + (high_bound - low_bound) / 2);

                if (guess === undefined) {
                    guess = mid;
                }

                if (guess === 0) {

                    return 0;

                } else {

                    is_midpoint_overflowing = are_words_fitting_in_element(element, words.slice(0, mid));
                    is_above_midpoint_overflowing = are_words_fitting_in_element(element, words.slice(0, mid + 1));

                    if (is_midpoint_overflowing) {

                        return index_for_best_fit(element, words, mid, low_bound, mid - 1);

                    } else if (!is_midpoint_overflowing && !is_above_midpoint_overflowing) {

                        return index_for_best_fit(element, words, mid, mid + 1, high_bound);

                    } else {

                        return mid;
                    }
                }
            }
        };

        $.each(this, function () {

            /**
             * selected_elm (HTMLElement) The current DOM element that we're about
             *                         to trucate the text of.
             * $selected_elm (jQuery) A jQuery wrapped version of the current element
             *                         we're about to truncate text for.
             * text_words (Array)    An array of the the words in the element, determined
             *                         by splitting the array by anything a regular expression
             *                         considers to be a white space.
             * initial_text (string)    The initial contents of the element
             * text_words_subset (Array)  The subset of the text_words array that contains the
             *                            letters and words that should be used to fill the final
             *                            element.
             * index_of_maximal_fill (int)  the index in the words array where all the words or
             *                              characters with index < index_of_maximal_fill will
             *                              fit in the element w/o overflowing, but where any
             *                              more words would cause clipping.
             */
            var
                selected_elm = this,
                $selected_elm = $(selected_elm),
                initial_text = $selected_elm.text(),
                text_words_subset,
                index_of_maximal_text_fill,
                text_words = configured_options.split_on_words
                    ? $.trim(initial_text).match(/[\S]+/g)
                    : $.trim(initial_text).split("");

            if ( ! text_words || ! text_words.length === 0) {
              console.log(initial_text);
              return;
            }

            // Make sure the text is currently set to be hidden.
            // If not, theres nothing to do
            if ($selected_elm.css("overflow") === "hidden") {

                // !important flag here is needed to make sure we don't have cascaded
                // overflow: hidden properties interfering with our measuring of how the
                // box responds to adding/subtracting text
                $selected_elm.css("overflow", "visible !important");

                index_of_maximal_text_fill = index_for_best_fit(selected_elm, text_words);

                // Only proceed and change the element text if we get a valid index back
                // from the serach.  Otherwise return the element to its original state
                // and don't process any further
                if (index_of_maximal_text_fill > -1) {

                    text_words_subset = text_words.slice(0, index_of_maximal_text_fill);

                    if (configured_options.split_on_words) {

                        $selected_elm.html(text_words_subset.join(" ") + configured_options.ellipsis_string);

                    } else {

                        $selected_elm.html($.trim(text_words_subset.join("")) + configured_options.ellipsis_string);

                    }

                    // If we're running with a version of jQuery that supports $.data, store the
                    // original text as data with the key "original text"
                    if ($.data) {

                        $selected_elm.data("original text", initial_text);

                    }
                }

                $selected_elm.css("overflow", "hidden");
            }
        });
    };

    /**
     * ellipsis_string (string)  The character that will be appended to the end of
     *                             the element's text to note that some text has been
     *                             truncated.  Defaults to "…"
     *
     * split_on_words (bool)       Whether to split the element's text on words or individual
     *                             characters.  Defaults to splitting on words
     */
    $.fn.ellipterrific.settings = {
        ellipsis_string: "…",
        split_on_words: true
    };

}(jQuery));