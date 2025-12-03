import ApplicationLifeCycleManager from '../app/lifecyclemanager';
import AuthManager from '../auth/authmanager';
import DragManager from '../../components/treeview/tools/dragmanager';
import PluginManager from '../auth/pluginmanager';
import ConfigManager from '../configuration/configmanager';
import GirafeConfig from '../configuration/girafeconfig';
import IGirafeContext from '../context/icontext';
import ErrorManager from '../error/errormanager';
import I18nManager from '../i18n/i18nmanager';
import LayerManager from '../layers/layermanager';
import SnapManager from '../layers/snapmanager';
import LocalFileManager from '../localfile/localfilemanager';
import LogManager from '../logging/logmanager';
import OfflineManager from '../offline/offlinemanager';
import OgcApiFeaturesManager from '../ogcapi/ogcapifeaturesmanager';
import OrderingManager from '../ordering/orderingmanager';
import SessionManager from '../share/sessionmanager';
import ShareManager from '../share/sharemanager';
import StateSerializer from '../share/stateserializer';
import ComponentManager from '../state/componentManager';
import MapManager from '../state/mapManager';
import StateManager from '../state/statemanager';
import UserInteractionManager from '../state/userInteractionManager';
import CustomThemesManager from '../themes/customthemesmanager';
import ThemesHelper from '../themes/themeshelper';
import ThemesManager from '../themes/themesmanager';
import UserLayerManager from '../themes/userlayermanager';
import PermalinkManager from '../url/permalinkmanager';
import UrlManager from '../url/urlmanager';
import UserDataManager from '../userdata/userdatamanager';
import WfsManager from '../wfs/wfsmanager';
import WmsManager from '../wms/wmsmanager';
import { MockConfig } from './mockconfig';
import OnBoardingManager from '../onboarding/onboardingmanager';

export default class MockGirafeContext implements IGirafeContext {
  public readonly userDataManager: UserDataManager;
  public readonly configManager: ConfigManager;
  public readonly stateManager: StateManager;
  public readonly componentManager: ComponentManager;
  public readonly userInteractionManager: UserInteractionManager;
  public readonly i18nManager: I18nManager;
  public readonly pluginManager: PluginManager;
  public readonly themesManager: ThemesManager;
  public readonly themesHelper: ThemesHelper;
  public readonly permalinkManager: PermalinkManager;
  public readonly urlManager: UrlManager;
  public readonly dragManager: DragManager;
  public readonly layerManager: LayerManager;
  public readonly sessionManager: SessionManager;
  public readonly stateSerializer: StateSerializer;
  public readonly shareManager: ShareManager;
  public readonly customThemesManager: CustomThemesManager;
  public readonly errorManager: ErrorManager;
  public readonly wfsManager: WfsManager;
  public readonly authManager: AuthManager;
  public readonly snapManager: SnapManager;
  public readonly mapManager: MapManager;
  public readonly logManager: LogManager;
  public readonly offlineManager: OfflineManager;
  public readonly applicationLifeCycleManager: ApplicationLifeCycleManager;
  public readonly orderingManager: OrderingManager;
  public readonly userLayerManager: UserLayerManager;
  public readonly wmsManager: WmsManager;
  public readonly ogcApiFeaturesManager: OgcApiFeaturesManager;
  public readonly localFileManager: LocalFileManager;
  public readonly onBoardingManager: OnBoardingManager;

  constructor() {
    this.componentManager = new ComponentManager(this);
    this.userDataManager = new UserDataManager(this);
    this.configManager = new ConfigManager(this);
    this.logManager = new LogManager(this);
    this.stateManager = new StateManager(this);
    this.orderingManager = new OrderingManager(this);
    this.applicationLifeCycleManager = new ApplicationLifeCycleManager(this);
    this.mapManager = new MapManager(this);
    this.offlineManager = new OfflineManager(this);
    this.snapManager = new SnapManager(this);
    this.authManager = new AuthManager(this);
    this.pluginManager = new PluginManager(this);
    this.i18nManager = new I18nManager(this);
    this.userInteractionManager = new UserInteractionManager(this);
    this.dragManager = new DragManager(this);
    this.urlManager = new UrlManager(this);
    this.permalinkManager = new PermalinkManager(this);
    this.layerManager = new LayerManager(this);
    this.userLayerManager = new UserLayerManager(this);
    this.themesHelper = new ThemesHelper(this);
    this.stateSerializer = new StateSerializer(this);
    this.sessionManager = new SessionManager(this);
    this.shareManager = new ShareManager(this);
    this.wfsManager = new WfsManager(this);
    this.errorManager = new ErrorManager(this);
    this.customThemesManager = new CustomThemesManager(this);
    this.themesManager = new ThemesManager(this);
    this.wmsManager = new WmsManager(this);
    this.localFileManager = new LocalFileManager(this);
    this.ogcApiFeaturesManager = new OgcApiFeaturesManager(this);
    this.onBoardingManager = new OnBoardingManager(this);

    this.initialize();
  }

  public async initialize() {
    // NOTE : This initialization order is important, because some singleton will need other ones !
    this.componentManager.initializeSingleton();
    this.userDataManager.initializeSingleton();
    this.userDataManager.setSource(MockConfig.userdata.source);
    this.userDataManager.deleteAllUserData();

    // @ts-ignore
    this.configManager['config'] = new GirafeConfig(MockConfig);
    // @ts-ignore
    this.configManager['defaultConfig'] = new GirafeConfig(MockConfig);

    this.logManager.initializeSingleton();
    this.stateManager.initializeSingleton();
    this.orderingManager.initializeSingleton();
    this.applicationLifeCycleManager.initializeSingleton();
    this.mapManager.initializeSingleton();
    this.offlineManager.initializeSingleton();
    this.snapManager.initializeSingleton();
    this.authManager.initializeSingleton();
    this.pluginManager.initializeSingleton();
    this.i18nManager.initializeSingleton();
    this.i18nManager.translations = { fr: { a: 'translated_a', b: 'translated_b' } };

    this.userInteractionManager.initializeSingleton();
    this.dragManager.initializeSingleton();
    this.urlManager.initializeSingleton();
    this.permalinkManager.initializeSingleton();
    this.layerManager.initializeSingleton();
    this.userLayerManager.initializeSingleton();
    this.themesHelper.initializeSingleton();
    this.stateSerializer.initializeSingleton();
    this.sessionManager.initializeSingleton();
    this.shareManager.initializeSingleton();
    this.wfsManager.initializeSingleton();
    this.errorManager.initializeSingleton();
    this.customThemesManager.initializeSingleton();
    this.themesManager.initializeSingleton();
    this.wmsManager.initializeSingleton();
    this.localFileManager.initializeSingleton();
    this.ogcApiFeaturesManager.initializeSingleton();
    this.onBoardingManager.initializeSingleton();
  }
}
