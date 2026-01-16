import { alertController } from '@ionic/vue';
import i18n from '@/i18n';

/**
 * Global functional confirm dialog using Ionic Alert
 * @example const ok = await confirmCustom('Warning', 'Delete this?', '⚠️');
 */
export const confirmCustom = async (
  title: string,
  message: string,
  icon?: string
): Promise<boolean> => {
  const { t } = i18n.global;

  return new Promise(async (resolve) => {
    const alert = await alertController.create({
      header: icon ? `${icon} ${title}` : title,
      message: message,
      backdropDismiss: false,
      buttons: [
        {
          text: t('common.cancel'),
          role: 'cancel',
          handler: () => resolve(false)
        },
        {
          text: t('common.ok'),
          role: 'confirm',
          handler: () => resolve(true)
        }
      ]
    });
    await alert.present();
  });
};