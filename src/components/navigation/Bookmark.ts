import MapPosition from '../../tools/state/mapposition';

export class Bookmark {
  static BOOKMARKNAMEPATTERN = /^[A-Za-zÀ-ž0-9_ -]+$/;
  name: string;
  position: MapPosition;

  public constructor(name: string, position: MapPosition) {
    if (!Bookmark.BOOKMARKNAMEPATTERN.test(name)) {
      throw new Error(
        'Bookmark name is not valid: it can only contain alphanumeric characters and the dash (-) underscore (_) and space characters.'
      );
    }
    this.name = name;
    this.position = position;
  }
}
