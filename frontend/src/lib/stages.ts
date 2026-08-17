import bfImage from '../assets/stages/bf.avif';
import fdImage from '../assets/stages/fd.avif';
import ps2Image from '../assets/stages/ps2.avif';
import sbfImage from '../assets/stages/sbf.avif';
import tncImage from '../assets/stages/tnc.avif';
import kalosImage from '../assets/stages/kalos.avif';
import hollowImage from '../assets/stages/hollow.avif';
import yoshisImage from '../assets/stages/yoshis.avif';
import smashvilleImage from '../assets/stages/smashville.avif';

// Stage-name -> image map with literal key inference (`satisfies` instead of
// an index-signature annotation, so `keyof` stays the union of actual stage
// names). Yoshi's Story is no longer in the active stage list but is kept so
// historical matches still render their stage art.
const STAGE_IMAGES = {
  'Battlefield': bfImage,
  'Small Battlefield': sbfImage,
  'Final Destination': fdImage,
  'Pokemon Stadium 2': ps2Image,
  'Smashville': smashvilleImage,
  'Town & City': tncImage,
  'Kalos Pokemon League': kalosImage,
  'Yoshi\'s Story': yoshisImage,
  'Hollow Bastion': hollowImage,
} satisfies Record<string, string>;

export type StageName = keyof typeof STAGE_IMAGES;

const isStageName = (name: string): name is StageName => name in STAGE_IMAGES;

/** Shared stage-name -> image lookup; undefined for unknown/legacy names, so
 *  callers can pass dynamic stage names straight off match rows. */
export function stageImage(name: string): string | undefined {
  return isStageName(name) ? STAGE_IMAGES[name] : undefined;
}

/** Every stage with art (active + historical), in map order. */
export const stageNames: string[] = Object.keys(STAGE_IMAGES);

/** Whether a dynamic stage name is one of the 8 active picker stages. */
export function isActiveStage(name: string): boolean {
  return ACTIVE_STAGES.some((stage) => stage === name);
}

/** The 8 active stages, in the picker order the design specifies. Typed
 *  against the literal keys of STAGE_IMAGES so a typo/renamed stage fails to
 *  compile instead of silently falling back to a placeholder texture. Yoshi's
 *  Story is deliberately excluded (see STAGE_IMAGES above). */
export const ACTIVE_STAGES: (keyof typeof STAGE_IMAGES)[] = [
  'Battlefield',
  'Small Battlefield',
  'Final Destination',
  'Pokemon Stadium 2',
  'Smashville',
  'Town & City',
  'Kalos Pokemon League',
  'Hollow Bastion',
];
