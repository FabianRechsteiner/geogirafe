import { METERS_PER_UNIT as ol_METERS_PER_UNIT } from 'ol/proj';

class GeoConsts {
  /** When circles needs to be rendered as polygon of N sides. */
  public static CIRCLE_TO_POLYGON_SIDES = 64;

  public static INCHES_PER_METER = 39.37;

  // TODO REG : Is this correct ?
  // It seems that the this should be correct for WMS created from MapSever,
  // but not from GeoServer for example, which is generating tile at 90 dpi.
  // Is there an OGC standard output resolution ?
  // Should we read the DPI from the WMS-Server configuration ?
  public static PRINT_DOTS_PER_INCH = 72;

  // TODO REG : Is this correct ?
  // shouldn't we read this information from the current display? (desktop, mobile, ...)
  // https://www.infobyip.com/detectmonitordpi.php
  public static SCREEN_DOTS_PER_INCH = 96;

  public static METERS_PER_UNIT = ol_METERS_PER_UNIT;
}

export default GeoConsts;
