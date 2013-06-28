B"H

##SidebarScrollbar

This script adds a scrollbar to the right sidebar in StackExchange chat rooms. This allows one to scroll through all the starred messages even when they get hidden behind the footer.

##TanachReferencer

This script adds a quick syntax for linking to online Tanach resources. Right now, it only supports Chabad.org, but Mechon-Mamre is coming soon, be"H. Type a reference in a question, answer, or comment, and it'll replace it with a link to the source. To trigger the replacement, click anywhere outside of the textbox. This includes the submit key.

###Syntax rules:

* The reference should be of the form [t book:chapter verse]. `verse` is optional.
  * Example: `[t div1:4 2]` is interpreted as Divrei HaYamim I 4:2 and is replaced with `http://www.chabad.org/library/bible_cdo/aid/16524#v2`
  * Breaks between sections can be `:` `;` `,` `.` `-` or a space (` `). The only exception is between the book name and the chapter number; **it will not accept a space, so you must use another break.** (This is so that it will recognize book names that have a space, i.e., `Divrei Hayamim I`.
* The only non-whitespace characters that are allowed directly outside of the brackets are parentheses.
  * This is so that the you can add your own link text in SE Markdown syntax, i.e., `[Why don't you check out this pasuk]([t Bereishis-3-7])`
* The script will recognize many different spellings and abbreviations for book names, but it will not accept less than 2 characters.
  * It only accepts common 2 or 3 letter abbreviations, so "gn", or "gen", but no "gene", or "genes".
  * Beware shared beginnings like "sh" and "ye". Could be shemot, shoftim or shmuel; yechezkel or yeshayahu. When in doubt, add a third character.
  * Examples: gn, gen, genesis, ber, bereishis, and bereshit are all acceptable.
* For Shmuel, Melachim, and Divrei Hayamim, simply add `1`, `2`, `i`, or `ii` after the book name.
  * shmuel1, shm2, sam1, chr1, div2, etc.,
  * shmuel 1, shm 2, sam 1, chr 1, div 2, mel 1, kings 2 etc., are now also valid
  * Hopefully, adding the number or numerals *before* the name will also work.
When in doubt about a spelling, just click outside the box to see whether it works.

###Flags:

If you're feeling adventurous, you can try the `r` and `t` flags. These are optional, and are inserted just before the closing bracket. Separate them from the previous sections with any of the breaks mentioned above.

* `r` will modify the link to show Rashi's commentary.
  * `[t ber-1-1 r]` -> `http://www.chabad.org/library/bible_cdo/aid/8165/showrashi/true#v1`
* `t` will insert SE's markdown syntax with the reference as the title.
  * `[t ber-1-1 t]` -> `[Bereshit 1:1](http://www.chabad.org/library/bible_cdo/aid/8165#v1)`
*You can use them together, in any order you like.
  * `[t ber-1-1-tr]` -> `[Bereshit 1:1](http://www.chabad.org/library/bible_cdo/aid/8165/showrashi/true#v1)`


###Other stuff

There is no validation for verse numbers. They cannot exceed 3 digits, but they do not check to see if the chapter has that many verses. This does not break any links, and is unlikely to be fixed anytime soon.

###Coming soon!

(For some value of soon)

A flag for Mechon Mamre!
More spellings!
Other stuff!
