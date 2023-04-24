import GeoEvents from '../../models/events';
import GirafeResizableElement from '../../base/GirafeResizableElement';
import I18nManager from '../../tools/i18nmanager';

class PrintComponent extends GirafeResizableElement {

  panel = null
  exportButton = null;
  scaleSelect = null;
  layoutSelect = null;
  formatSelect = null;
  titleInput = null;
  commentInput = null;
  downloadButton = null;
  printList = null;

  printUrl = null;
  defaultLayout = null;
  printApp = null;
  printLayouts = null;
  layoutsByName = {};
  printFormats = null;

  downloadUrl = null;
  statusUrl = null;

  projection = null;
  centerCoords = null;

  get capabilitiesUrl() {
    return this.printUrl + 'capabilities.json';
  }

  getReportUrl(format) {
    return this.printUrl + 'report.' + format;
  }
  
  getDownloadUrl(result) {
    return this.printUrl + result.downloadURL.substring(result.downloadURL.indexOf('/report') + 1);
  }

  getStatusUrl(result) {
    return this.printUrl + result.statusURL.substring(result.statusURL.indexOf('/status') + 1);
  }
  
  constructor() {
    super('print');
  }

  async initializePrint() {
    this.printUrl = this.configManager.Config.print.url;
    this.defaultLayout = this.configManager.Config.print.defaultLayout;
    if (!this.printUrl.endsWith('/')) {
      this.printUrl += '/';
    }

    const response = await fetch(this.capabilitiesUrl, {referrer:''});
    const content = await response.json();
    this.printApp = content["app"];
    this.printLayouts = content["layouts"];
    this.printFormats = content["formats"];
  }

  render() {
    super.render();

    // Bar is hidden per default
    this.panel = this.shadow.querySelector('#panel');
    this.panel.style.display = 'none';

    this.exportButton = this.shadow.querySelector('#export-pdf');
    this.scaleSelect = this.shadow.querySelector('#scale');
    this.layoutSelect = this.shadow.querySelector('#layout');
    this.formatSelect = this.shadow.querySelector('#format');
    this.titleInput = this.shadow.querySelector('#title');
    this.commentInput = this.shadow.querySelector('#comment');
    this.downloadButton = this.shadow.querySelector('#download');
    this.printList = this.shadow.querySelector('#printList');

    // Initialize layout, scales and formats
    this.printLayouts.forEach(elem => {
      this.layoutsByName[elem.name] = elem;
      this.addLayoutOption(this.layoutSelect, elem);
    });
    if (this.defaultLayout !== null) {
      this.layoutSelect.value = this.defaultLayout;
    }
    const layout = this.layoutsByName[this.layoutSelect.value];
    const clientInfo = layout.attributes.filter(elem => elem.type === 'MapAttributeValues')[0].clientInfo;
    this.updateScales(clientInfo);

    this.printFormats.forEach(elem => {
      this.addFormatOption(this.formatSelect, elem);
    });

    this.activateTooltips(false, [800, 0], 'top-end');
    super.translate();
  }

  closePanel() {
    this.state.interface.printPanelVisible = false;
  }

  addFormatOption(select, elem) {
    // Create new basemap option
    const option = document.createElement('option');
    option.innerHTML = elem;
    option.value = elem;
    select.appendChild(option);
  }

  addLayoutOption(select, elem) {
    // Create new basemap option
    const option = document.createElement('option');
    option.setAttribute('i18n', elem.name);
    option.innerHTML = elem.name;
    option.value = elem.name;
    select.appendChild(option);
  }

  addScaleOption(select, scale) {
    // Create new basemap option
    const option = document.createElement('option');
    option.innerHTML = '1:' + scale;
    option.value = scale;
    select.appendChild(option);
  }

  registerEvents() {
    this.stateManager.subscribe('interface.printPanelVisible', (oldValue, newValue) => this.#togglePanel(newValue));

    this.layoutSelect.addEventListener('change', (e) => this.onLayoutChanged(e));
    this.scaleSelect.addEventListener('change', (e) => this.onScaleChanged(e));
    this.exportButton.addEventListener('click', () => this.print());
  }

  onLayoutChanged(e) {
    const layout = this.layoutsByName[e.target.value];
    const clientInfo = layout.attributes.filter(elem => elem.type === 'MapAttributeValues')[0].clientInfo;
    this.updateScales(clientInfo);
    this.state.print.format = [clientInfo.width, clientInfo.height];
  }

  onScaleChanged(e) {
    this.state.print.scale = e.target.value
  }

  updateScales(clientInfo) {
    // Update scales
    const currentSelectedValue = this.scaleSelect.value;
    this.scaleSelect.innerHTML = '';
    clientInfo.scales.forEach(scale => {
      this.addScaleOption(this.scaleSelect, scale);
    });
    // Restore previously selected value
    if (!this.isNullOrUndefinedOrBlank(currentSelectedValue)) {
      this.scaleSelect.value = currentSelectedValue;
      this.scaleSelect.value = currentSelectedValue;
    }
    else {
      this.scaleSelect.value = clientInfo.scales[0];
    }
  }

  connectedCallback() {
    this.loadTemplate()
    .then(() => this.initializePrint()
      .then(() => {
        this.render();
        this.registerEvents();
    }));
  }

  #togglePanel(visible) {
    if (visible) {
      this.panel.style.display = 'block';
      this.panel.getRootNode().host.style.display = 'block';
      // Set default print state
      const layout = this.layoutsByName[this.layoutSelect.value];
      const clientInfo = layout.attributes.filter(elem => elem.type === 'MapAttributeValues')[0].clientInfo;
      this.state.print.scale = this.scaleSelect.value;
      this.state.print.format = [clientInfo.width, clientInfo.height];
    }
    else {
      this.panel.style.display = 'none';
      this.panel.getRootNode().host.style.display = 'none';
    }
  }

  print() {
    const layout = this.layoutSelect.value;
    const format = this.formatSelect.value;
    const scale = this.scaleSelect.value;

    const body = {
      "attributes": {
          "map": {
              "dpi": 254,
              "rotation": 0,
              "center": [this.state.position.center[0], this.state.position.center[1]],
              "projection": this.state.projection,
              "scale": scale,
              "useNearestScale": false,
              "layers": [
                  {
                      "baseURL": "https://map.geo.test.bs.ch/mapserv_proxy",
                      "imageFormat": "image/png",
                      "layers": [
                          "Stadt- und Parzellenplan farbig"
                      ],
                      "customParams": {
                          "TRANSPARENT": "true",
                          "ogcserver": "WMS BS (1)"
                      },
                      "serverType": "mapserver",
                      "type": "wms",
                      "opacity": 1,
                      "useNativeAngle": true,
                      "styles": [
                          ""
                      ]
                  },
              ]
          },
          "title": this.titleInput.value,
          "comment": this.commentInput.value,
          "maxTitleLength": "130",
          "maxCommentLength": "190"
      },
      "format": format,
      "lang": "en",
      "layout": layout
    }
    
    fetch(this.getReportUrl(format), {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8'
      }),
      body: JSON.stringify(body),
    })
    .then(r => r.json())
    .then(result => this.managePrintStatus(result));
  }

  managePrintStatus(result) {
    const downloadUrl = this.getDownloadUrl(result);
    const statusUrl = this.getStatusUrl(result);

    const elementId = 'p-' + result.ref.substring(0, result.ref.indexOf('-'));
    this.addPrintToList(elementId);

    setTimeout(function(elementId, statusUrl, downloadUrl) {
      this.checkStatus(elementId, statusUrl, downloadUrl)
    }.bind(this, elementId, statusUrl, downloadUrl), 2000);
  }

  addPrintToList(elementId) {

    const container = document.createElement('div');
    container.className = 'girafe';
    container.id = elementId;

    // Add status
    const status = document.createElement('i');
    status.className = 'fa-solid fa-circle-notch fa-spin fa-3x';
    container.appendChild(status);

    // Layout
    const layout = document.createElement('span');
    layout.innerHTML = this.layoutSelect.value + ' (' + this.formatSelect.value + ')';
    container.appendChild(layout);

    // Title
    const title = document.createElement('span');
    title.innerHTML = this.titleInput.value;
    container.appendChild(title);

    // Time
    const date = new Date(Date.now());
    const time = document.createElement('span');
    time.innerHTML = date.getHours() + ':' + date.getMinutes();
    time.className = "time";
    container.appendChild(time);

    this.printList.prepend(container);
  }

  checkStatus(elementId, statusUrl, downloadUrl) {
    fetch(statusUrl)
    .then(r => r.json())
    .then(status => {
      if (!status.done) {
        // We wait maximum 30 seconds
        if (status.elapsedTime > 30000) {
          alert('timeout');
        }
        else {
          // Continue to wait
          setTimeout(function(elementId, statusUrl, downloadUrl) {
            this.checkStatus(elementId, statusUrl, downloadUrl)
          }.bind(this, elementId, statusUrl, downloadUrl), 2000);
        }
      }
      else {
        // Print is done.
        switch (status.status) {
          case "error":
            this.printError(elementId, status.error);
            break;
          case "finished":
            this.printFinished(elementId, downloadUrl);
        }
      }
    })
  }

  printFinished(elementId, downloadUrl) {
    const div = this.shadow.querySelector('#' + elementId);
    const status = div.querySelectorAll('i')[0];
    status.className = 'fa-solid fa-file-arrow-down fa-3x';
    status.onclick = () => window.open(downloadUrl,'_blank');
  }

  printError(elementId, error) {
    const div = this.shadow.querySelector('#' + elementId);
    const status = div.querySelectorAll('i')[0];
    status.className = 'fa-solid fa-triangle-exclamation fa-3x';
    status.title = error;
  }
}

customElements.define('girafe-print', PrintComponent);

export default PrintComponent;