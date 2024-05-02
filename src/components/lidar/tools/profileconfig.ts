/**
 * The lidar point attribute list width default option
 */
type LidarPointAttributeList = {
  availableOptions?: LidarProfileServerConfigPointAttribute[];

  selectedOption?: LidarProfileServerConfigPointAttribute;
};

/**
 * The object containing all points in profile
 */
export type LidarProfileClientConfig = {
  autoWidth?: boolean;

  margin: {
    [x: string]: number;
  };

  pointAttributes?: LidarPointAttributeList;
  pointSum?: number;
  tolerance?: number;
};

export type LidarProfileServerConfigClassification = {
  color?: string;
  name?: string;
  value?: string;
  /** Visible (Value can be 1 or 0) */
  visible?: number;
};

export type LidarProfileServerConfigClassifications = {
  [x: number]: LidarProfileServerConfigClassification;
};

type LidarProfileServerConfigLevel = {
  max?: number;
  width?: number;
};

export type LidarProfileServerConfigLevels = {
  [x: number]: LidarProfileServerConfigLevel;
};

export type LidarProfileServerConfigPointAttribute = {
  bytes?: number;
  elements?: number;
  name?: string;
  value?: string;
  visible?: number;
};

export type LidarProfileServerConfigPointAttributes = {
  [x: string]: LidarProfileServerConfigPointAttribute;
};

type LidarProfileServerConfig = {
  classes_names_normalized?: {
    [x: number]: string;
  };
  classes_names_standard?: {
    [x: number]: string;
  };
  classification_colors?: LidarProfileServerConfigClassifications;
  debug?: boolean;
  default_attribute?: string;
  default_color?: string;
  default_point_attribute?: string;
  default_point_cloud?: string;
  initialLOD?: number;
  max_levels?: LidarProfileServerConfigLevels;
  max_point_number?: number;
  minLOD?: number;
  point_attributes?: LidarProfileServerConfigPointAttributes;
  point_size?: number;
  vertical_pan_tolerance?: number;
  width?: number;
};

export class LidarProfileConfig {
  pytreeLidarProfileJsonUrl: string;

  /**
   * The configuration from the LIDAR server.
   */
  serverConfig?: LidarProfileServerConfig;

  /**
   * The client configuration.
   */
  clientConfig: LidarProfileClientConfig;
  /**
   * Configuration service to configure the lidar profile.
   * Requires a Pytree service url: https://github.com/sitn/pytree
   */
  constructor(pytreeLidarProfileJsonUrl: string) {
    this.pytreeLidarProfileJsonUrl = pytreeLidarProfileJsonUrl;
    /**
     * The client configuration.
     */
    this.clientConfig = {
      autoWidth: true,
      margin: {
        left: 40,
        top: 10,
        right: 200,
        bottom: 40
      },
      pointAttributes: {},
      pointSum: 0,
      tolerance: 5
    };
  }

  /**
   * Initialize the service variables from Pytree route.
   * @returns Promise<void | Response> The server configuration.
   */
  async initProfileConfig(): Promise<void | Response> {
    const url = `${this.pytreeLidarProfileJsonUrl}/profile/config`;

    return fetch(url)
      .then((resp) =>
        resp.json().then((data: LidarProfileServerConfig) => {
          this.setupConfig(data);
        })
      )
      .catch((error) => {
        console.error('Can not load lidar config', error);
      });
  }

  /**
   * Initialize the server config object.
   */
  protected setupConfig(data: LidarProfileServerConfig) {
    this.serverConfig = {
      classification_colors: data.classification_colors,
      debug: !!data.debug,
      default_attribute: data.default_attribute ?? '',
      default_color: data.default_color ?? '',
      default_point_attribute: data.default_point_attribute ?? '',
      default_point_cloud: data.default_point_cloud ?? '',
      initialLOD: data.initialLOD ?? 0,
      max_levels: data.max_levels,
      max_point_number: data.max_point_number ?? 50000,
      minLOD: data.minLOD ?? 0,
      point_attributes: data.point_attributes ?? {},
      point_size: data.point_size ?? 0,
      vertical_pan_tolerance: data.vertical_pan_tolerance ?? 0,
      width: data.width ?? 0
    };

    const attr: LidarProfileServerConfigPointAttribute[] = [];
    for (const key in this.serverConfig.point_attributes) {
      if (this.serverConfig.point_attributes[key].visible === 1) {
        attr.push(this.serverConfig.point_attributes[key]);
      }
    }

    const selectedMat = this.serverConfig.point_attributes![this.serverConfig.default_point_attribute!];

    this.clientConfig.pointAttributes = {
      availableOptions: attr,
      selectedOption: selectedMat
    };
  }
}

export default LidarProfileConfig;
