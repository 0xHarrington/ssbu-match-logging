import bfImage from '../assets/stages/bf.avif';
import fdImage from '../assets/stages/fd.avif';
import ps2Image from '../assets/stages/ps2.avif';
import sbfImage from '../assets/stages/sbf.avif';
import tncImage from '../assets/stages/tnc.avif';
import kalosImage from '../assets/stages/kalos.avif';
import hollowImage from '../assets/stages/hollow.avif';
import yoshisImage from '../assets/stages/yoshis.avif';
import smashvilleImage from '../assets/stages/smashville.avif';

// Shared stage-name -> image map. Yoshi's Story is no longer in the active
// stage list but is kept so historical matches still render their stage art.
export const stageImages: { [key: string]: string } = {
  'Battlefield': bfImage,
  'Small Battlefield': sbfImage,
  'Final Destination': fdImage,
  'Pokemon Stadium 2': ps2Image,
  'Smashville': smashvilleImage,
  'Town & City': tncImage,
  'Kalos Pokemon League': kalosImage,
  'Yoshi\'s Story': yoshisImage,
  'Hollow Bastion': hollowImage,
};
