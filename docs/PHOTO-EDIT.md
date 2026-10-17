# Team photo preparation

The team supplied both photographs for these public team cards. The first supplied image is assigned to Om; the second to Ajeet, following the order of the request. Original uploads are preserved in `docs/team-originals/om.png` and `ajeet.png`. The full edited result is preserved as `ajeet-enhanced.png`.

Ajeet's lower-resolution image was gently cleaned using the built-in imagegen tool; screenshot chrome was removed. It is an edited image, not a verified recovery of unavailable original detail. No AI image was made for Om. WebP encodings keep the public payload small; CSS provides the card framing.

Public paths: `frontend/public/team/om.webp` and `frontend/public/team/ajeet.webp`. Profile links live in `frontend/src/config/publicSite.js`. No profile-photo hotlink or authenticated LinkedIn session is required by the site.

## Exact edit prompt

Use case: identity-preserve. Edit target: the attached low-resolution screenshot portrait, image(5).png. Asset type: authentic team-member headshot for a website. Primary request: modestly improve clarity and remove screenshot chrome only. Preserve this exact person's face geometry, facial expression, skin tone, age, eyes, hairstyle, beard, dark open shirt and light inner T-shirt, pose and head angle. Do not beautify, stylize, change clothes, alter identity, change background lighting, or invent sharp facial detail that cannot be recovered. Keep natural photographic texture and the slight softness appropriate to the original. Composition: a square head-and-shoulders crop centered on the existing portrait with its original white background; remove the dark screenshot frame and the close X. Keep all of the visible hair and shoulders; crop within the available original portrait, do not generate unseen body. No text, no logos, no watermark. The result should look like the same original photograph cleaned up gently, not a new AI portrait.
