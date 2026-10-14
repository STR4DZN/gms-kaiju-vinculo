/** Approved apex artwork. Geometry stays static; motion uses the previous contour/frame system. */
const path=(d:string,cls='',extra='')=>`<path class="${cls}" d="${d}" ${extra}/>`;
const joint=(name:string,body:string,_origin='')=>`<g data-part="${name}">${body}</g>`;
function sovereign():string{
 const leftHorn=path('M191 210L122 185L86 123L51 21L125 70L175 105L215 181Z','apex-ink')+path('M158 162L118 123L87 68L158 113Z','apex-dark');
 const rightHorn=path('M321 210L390 185L426 123L461 21L387 70L337 105L297 181Z','apex-ink')+path('M354 162L394 123L425 68L354 113Z','apex-dark');
 const crown=path('M156 180L160 72L206 123L226 28L256 86L286 28L306 123L352 72L356 180Z','apex-ink')+path('M209 149L256 98L303 149L284 166L256 139L228 166Z','apex-dark');
 const face=path('M163 157L209 167L256 141L303 167L349 157L384 228L368 284L334 325L288 303L256 336L224 303L178 325L144 284L128 228Z','apex-ink')+path('M173 205L228 214L233 233L200 247L171 232ZM339 205L284 214L279 233L312 247L341 232ZM240 235L256 204L272 235L262 277L256 292L250 277Z','apex-dark')+path('M180 216L219 224M332 216L293 224M166 266L194 284M346 266L318 284','apex-line');
 const jaw=path('M177 293L209 308L224 337L256 350L288 337L303 308L335 293L353 346L335 391L304 426L256 472L208 426L177 391L159 346Z','apex-ink')+path('M190 328L210 366L229 345L244 383L256 365L268 383L283 345L302 366L322 328L321 386L288 412L256 448L224 412L191 386Z','apex-dark')+path('M207 397L256 433L305 397','apex-line');
 return joint('sovereign-body',joint('sovereign-crown',crown,'256px 175px')+joint('sovereign-horn-left',leftHorn,'205px 188px')+joint('sovereign-horn-right',rightHorn,'307px 188px')+joint('sovereign-face',face,'256px 280px')+joint('sovereign-jaw',jaw,'256px 303px'),'256px 286px');
}
function concordance():string{
 const rail=(d:string)=>path(d,'apex-ink')+path(d,'apex-line','fill="none" stroke-width="3"');
 const a=rail('M252 24L119 87L70 185L107 312L176 351L210 284L165 250L146 179L181 134L252 104Z')+path('M163 106L109 191L137 267','apex-line');
 const b=rail('M260 488L393 425L442 327L405 200L336 161L302 228L347 262L366 333L331 378L260 408Z')+path('M349 406L403 321L375 245','apex-line');
 const inner=path('M256 139L358 199V313L256 374L154 313V199Z','apex-ink')+path('M256 174L326 215V296L256 338L186 296V215Z','apex-dark')+path('M256 207L298 231V281L256 306L214 281V231Z','apex-ink')+path('M231 242L256 228L281 242V269L256 284L231 269Z','apex-dark');
 return joint('concord-left',a,'256px 256px')+joint('concord-right',b,'256px 256px')+joint('concord-core',inner,'256px 256px');
}
function bastion():string{
 const face=path('M191 155L221 127H291L321 155L310 258L281 303H231L202 258Z','apex-ink')+path('M210 177H302L281 207H231ZM234 227H278L266 264H246Z','apex-dark');
 const upper=path('M81 115L146 52L238 28V119L185 153L154 198L89 172Z','apex-ink')+path('M95 124L155 76L220 57V90L172 119L135 170Z','apex-dark');
 const right=path('M431 115L366 52L274 28V119L327 153L358 198L423 172Z','apex-ink')+path('M417 124L357 76L292 57V90L340 119L377 170Z','apex-dark');
 const leftFlank=path('M64 180L146 219L172 296L198 321L183 386L128 340L86 258Z','apex-ink')+path('M93 222L131 242L146 291L124 284Z','apex-dark');
 const rightFlank=path('M448 180L366 219L340 296L314 321L329 386L384 340L426 258Z','apex-ink')+path('M419 222L381 242L366 291L388 284Z','apex-dark');
 const leftBase=path('M198 331L247 335V486L193 443L160 395Z','apex-ink')+path('M207 376L230 380V435L194 406Z','apex-dark');
 const rightBase=path('M314 331L265 335V486L319 443L352 395Z','apex-ink')+path('M305 376L282 380V435L318 406Z','apex-dark');
 return joint('bastion-face',face,'256px 256px')+joint('bastion-upper-left',upper,'238px 140px')+joint('bastion-upper-right',right,'274px 140px')+joint('bastion-flank-left',leftFlank,'190px 288px')+joint('bastion-flank-right',rightFlank,'322px 288px')+joint('bastion-base-left',leftBase,'247px 335px')+joint('bastion-base-right',rightBase,'265px 335px');
}
export const APEX_GLYPHS:Record<string,string>={'kaiju-sovereign':sovereign(),'concordance-core':concordance(),'human-bastion':bastion()};
