                                                                                                                     B"H
##SidebarScrollbar 

This script adds a scrollbar to the right sidebar in StackExchange chat rooms.
This allows one to scroll through all the starred messages even when they get 
hidden behind the footer.




##TanachReferencer

This script adds a quick syntax for linking to online Tanach resources. 
Right now, it only supports Chabad.org, but Mechon-Mamre is coming soon, be"H.
Type a reference in a question, answer, or comment.
To trigger the replacement, click anywhere outside of the textbox. This includes the submit key.

###Syntax rules:

* The reference must be of the form [ref:book-chapter-verse]
  * `[ref:div1-4-2]` -> Divrei HaYamim I 4:2
* The only characters that are allowed directly next to the brackets are parentheses.
  * This is so that the you can add your own link text in SE Markdown syntax, i.e.,
  `[Why don't you check out this pasuk]([ref:Bereishis-3-7])`
* The script will recognize many different spellings and abbreviations for book names,
  but it will not accept less than 2 characters. 
  * It only accepts common 2 or 3 letter abbreviations, so "gn", or "gen", but no "gene", or "genes".
  * Shared beginnings like "sh" and "ye". Could be shemot, shoftim or shmuel; yechezkel or yeshayahu. 
    When in doubt, add a third character.
  * Example: gn, gen, genesis, ber, bereishis, and bereshit are all acceptable.
* For Shmuel, Melachim, and Divrei Hayamim, simply add a number after the book name.
  * shmuel1, shm2, sam1, chr1, div2, mel1, kings2
* When in doubt about a spelling, just click outside the box to see whether it works.

###Flags:

If you're feeling adventurous, you can try the `r` or `t` flags. 
These are optional, and are inserted just before the closing bracket.

* `r` will modify the link to show Rashi's commentary.
  * `[ref:ber-1-1-r]`  -> `http://www.chabad.org/library/bible_cdo/aid/8165/showrashi/true#v1`
* `t` will insert SE's markdown syntax with the reference as the title.
  * `[ref:ber-1-1-t]`  -> `[Bereshit 1:1](http://www.chabad.org/library/bible_cdo/aid/8165#v1)`
* You can use them together, in any order you like.
  * `[ref:ber-1-1-tr]` -> `[Bereshit 1:1](http://www.chabad.org/library/bible_cdo/aid/8165/showrashi/true#v1)`

###Other stuff
There is no validation for verse numbers. They cannot exceed 3 digits, 
but they do not check to see if the chapter has that many verses. This does
not break any links, and is unlikely to be fixed anytime soon. 

###Coming soon!

(For some value of soon)

* A flag for Mechon Mamre!
* More spellings! Including `I` and `II` for Shmuel, et al.
* Other stuff!
