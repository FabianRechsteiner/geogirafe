import GirafeSingleton from '../../base/GirafeSingleton';
import CustomTheme from '../../models/customtheme';
import ThemeLayer from '../../models/layers/themelayer';

class ThemeFavoritesManager extends GirafeSingleton {
  private themeFavorites: Array<number | string> = [];
  private readonly storagePath: string = 'themeFavorites';

  public initializeSingleton() {
    super.initializeSingleton();
    this.loadThemeFavorites();
  }

  private saveThemeFavorites(): void {
    const serializedThemeFavorites: string = JSON.stringify(this.themeFavorites);
    this.context.userDataManager.saveUserData(this.storagePath, serializedThemeFavorites);
  }

  private loadThemeFavorites(): void {
    const serializedThemeFavorites = this.context.userDataManager.getUserData(this.storagePath) as string | null;
    if (serializedThemeFavorites) {
      this.themeFavorites = JSON.parse(serializedThemeFavorites);
    }
  }

  public addThemeToFavorites(theme: ThemeLayer | CustomTheme): void {
    this.themeFavorites.push(theme instanceof ThemeLayer ? theme.id : theme.name);
    this.saveThemeFavorites();
  }

  public removeThemeFromFavorites(theme: ThemeLayer | CustomTheme): void {
    const index = this.themeFavorites.findIndex((themeIdOrName) =>
      theme instanceof ThemeLayer ? themeIdOrName === theme.id : themeIdOrName === theme.name
    );
    if (index >= 0) {
      this.themeFavorites.splice(index, 1);
      this.saveThemeFavorites();
    } else {
      throw new Error('The theme to be removed cannot be found in the list of favorites');
    }
  }

  public addOrRemoveThemeFromFavorites(theme: ThemeLayer | CustomTheme): void {
    if (this.isThemeInFavorites(theme)) {
      this.removeThemeFromFavorites(theme);
    } else {
      this.addThemeToFavorites(theme);
    }
  }

  public clearThemeFavorites(): void {
    this.themeFavorites = [];
    this.saveThemeFavorites();
  }

  public isThemeInFavorites(theme: ThemeLayer | CustomTheme): boolean {
    return this.themeFavorites.includes(theme instanceof ThemeLayer ? theme.id : theme.name);
  }

  public getThemeFavorites(): Array<number | string> {
    return this.themeFavorites;
  }
}

export default ThemeFavoritesManager;