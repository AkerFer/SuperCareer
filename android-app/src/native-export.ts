import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { registerCareerExporter } from '../../website/src/export';
if (Capacitor.isNativePlatform()) {
  registerCareerExporter(async game => {
    const file = await Filesystem.writeFile({
      path: `football-legacy-${game.season}.json`,
      data: JSON.stringify(game),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({title: 'Сохранение Football Legacy', files: [file.uri], dialogTitle: 'Сохранить карьеру'});
  });
}
