B"H

##SidebarScrollbar

This script adds a scrollbar to the right sidebar in StackExchange chat rooms. This allows one to scroll through all the starred messages even when they get hidden behind the footer.

##Mi Yodeya Referencer

This script adds a quick syntax for linking to online Tanach, Talmud Bavli, and Mishna Torah resources.
By default the Tanach links to Chabad.org, but you can change it to Mechon Mamre with an optional flag (see below). Type a reference in a question, answer, or comment, and it'll replace it with a link to the source. 
Matches are highlighted as you type, green if they're valid and red if they're not. Hover over the reference for more information.
References are replaced when you click submit. (I'm working pressing the enter key as well.)
Gemara links go to hebrewbooks.org, Mishna Torah in Hebrew goes to Mechon Mamre, and English goes to Chabad.org

###Tanach Syntax rules:

* The Tanach references should be of the form `[t book chapter verse]`. `verse` is optional.
  * Example: `[t div1 4 2]` is interpreted as Divrei HaYamim I 4:2 and is replaced with `http://www.chabad.org/library/bible_cdo/aid/16524#v=2`
* The script will recognize many different spellings and abbreviations for book names, but it will not accept less than 2 characters.
  * It's case-insenstive. (That means capitalization doesn't change anything.)
  * It only accepts common 2 or 3 letter abbreviations, so "gn", or "gen", but no "gene", or "genes".
  * Beware shared beginnings like "sh" and "ye". Could be shemot, shoftim or shmuel; yechezkel or yeshayahu. When in doubt, add a third character.
  * Examples: gn, gen, genesis, ber, bereishis, and bereshit are all acceptable.
* For Shmuel, Melachim, and Divrei Hayamim, simply add `1`, `2`, `i`, or `ii` directly after the book name (no space).
  * shmuel1, shm2, sam1, chr1, div2, Divrei Hayamim1, etc.,
  * In most cases, adding the number or numerals *before* the name will also work.
When in doubt about a spelling, just click outside the box to see whether it works.

####Other stuff
There is no validation for verse numbers. They cannot exceed 3 digits, but they do not check to see if the chapter has that many verses. This does not break any links, and is unlikely to be fixed anytime soon.

###Gemara Syntax Rules:
* Gemara references should be of the form `[g mesechta page]`.
  * Example: `[g berachot 34b]` (Don't forget your a's and b's)
* Plenty of abbreviations. bk, bm, and bb for the Bavas. ndr and ned for nedarim, etc., etc.,
  * Feel free to let me know if you want to add some.
  * Some easy abbreviations have been left out, i.e., nd. Could be nedarim or niddah, so neither. Too bad, so sad.

###Mishna Torah Syntax Rules:
* Mishna Torah references should be of the form `[mt topic chapter law]`. Chapter and law are both optional.
  * Example: `[mt De'ot 1]` (Omitting a chapter will link to the Rambams introduction for that section.)
* Plenty of abbreviations. tt for Talmud Torah, er for Eruvin. ndr and ned for nedarim, etc., etc.,
  * There are many that could we didn't get to; feel free to let me know if you want to add some.
  * If your input matches multiple section names, you will get none of them. A popup will appear, with more information.

###Flags:
If you're feeling adventurous, you can try adding flags to change the output. These are optional, and are inserted just before the closing bracket. Separate them from the previous sections with any of the breaks mentioned above.
. Some flags are specific to the source, and some are not

####Universal flags:

* `l` will insert SE's markdown link syntax with the reference as the title.
  * `[t ber 1 1 l]` -> `[Bereishit 1:1](http://www.chabad.org/library/bible_cdo/aid/8165#v=1)`
* `u` will insert a link like the `l` but the book title will be exactly how you inputted it.
  * `[t Breishis 1 1 u]` -> `[Breishis 1:1](http://www.chabad.org/library/bible_cdo/aid/8165#v=1)`

####Tanach Flags:
* `r` will modify the link to show Rashi's commentary.
  * `[t ber 1 1 r]` -> `http://www.chabad.org/library/bible_cdo/aid/8165#showrashi=true&v=1`
* `m` will link to Mechon Mamre instead of Chabad.org. (Note: Mechon Mamre does not offer Rashi; the `r` flag will be ignored.
  * `[t ber 1 1 m]` - > `http://www.mechon-mamre.org/p/pt/pt0101.htm#1`
* You can use them together, in any order you like.
  * `[t ber 1 1 lr]` -> `[Bereishit 1:1](http://www.chabad.org/library/bible_cdo/aid/8165#showrashi=true&v=1)`
  * `[t ber 1 1 lm]` -> `[Bereshit 1:1](http://www.mechon-mamre.org/p/pt/pt0101.htm#1)`

####Gemara Flags
* `t` links to the text version of the daf, rather than the pdf version
  * With: `[g berachot 30b t]` -> `http://hebrewbooks.org/shas.aspx?mesechta=1&daf=30b&format=text`
  * Without: `[g berachot 30b]` -> `http://hebrewbooks.org/shas.aspx?mesechta=1&daf=30b&format=pdf`

####Mishna Torah Flags
* `e' links to Chabad.org's english Mishna Torah
  * With:    `[mt meilah 4 e]` -> `http://www.chabad.org/library/article_cdo/aid/1062932`
  * Without: `[mt meilah 4]` -> `http://www.mechon-mamre.org/i/8904.htm`

###Advanced Syntax:
* Breaks between sections can be `:` `;` `,` `.` or a space (` `).
* The only non-whitespace characters that are allowed directly outside of the brackets are `( ) , . ; :` .
  * This is so that the you can add your own link text in SE Markdown syntax, i.e., `[Why don't you check out this pasuk]([t Bereishis 3 7])`

###Coming soon!

(For some value of soon)
  
Mesechtos Ktanos? Maybe? If I feel like it.  
Even more spellings!  
Shulchan Aruch!  
Midrash Rabba!  
Other stuff!  
