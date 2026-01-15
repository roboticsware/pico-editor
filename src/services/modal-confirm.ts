import { alertController } from '@ionic/vue';

/**
 * Global functional confirm dialog using Ionic Alert
 * @example const ok = await confirmCustom('Warning', 'Delete this?');
 */
export const confirmCustom = async (title: string, message: string): Promise<boolean> => {
  return new Promise(async (resolve) => {
    const alert = await alertController.create({
      header: title,
      message: message,
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cancel', // Or '취소' if I18n is preferred, but simple string here for now
          role: 'cancel',
          handler: () => resolve(false)
        },
        {
          text: 'OK', // Or '확인'
          role: 'confirm',
          handler: () => resolve(true)
        }
      ]
    });
    await alert.present();
  });
};