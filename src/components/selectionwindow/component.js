import GirafeDraggableElement from '../../base/GirafeDraggableElement';

class SelectionWindowComponent extends GirafeDraggableElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  maxFeatures = 200;
  focusedIndex = null;

  content = null;
  previousButton = null;
  nextButton = null;
  counter = null;

  constructor() {
    super('selectionwindow');
  }

  render() {
    super.render();
    this.content = this.shadow.querySelector('#content');
    this.previousButton = this.shadow.querySelector('#previous');
    this.nextButton = this.shadow.querySelector('#next');
    this.counterText = this.shadow.querySelector('#counter');
  }

  registerEvents() {
    this.previousButton.addEventListener('click', () => this.onFocusFeature(this.focusedIndex - 1));
    this.nextButton.addEventListener('click', () => this.onFocusFeature(this.focusedIndex + 1));
  }

  onFocusFeature(index) {
    this.focusedIndex = index;
    this.state.focusedFeature = this.state.selectedFeatures[index];

    // Title (draggable header)
    const id = this.state.focusedFeature.getId();
    const featureType = (id === undefined) ? 'UNKNOWN' : id.split('.')[0];
    this.header.setAttribute('i18n', featureType);

    // Content
    const properties = this.state.focusedFeature.getProperties();
    const table = document.createElement('table');
    for (const key in properties) {

      // Exclude openlayers properties and geometry
      // TODO REG: Find the right geometry property using WFS Capabilities
      if (key !== 'boundedBy' && key !== 'the_geom') {
        const tr = document.createElement('tr');
        
        const td = document.createElement('td');
        td.className = 'label';
        td.setAttribute('i18n', key);
        tr.appendChild(td);

        const val = document.createElement('td');
        val.className = 'value';
        val.innerHTML = properties[key];
        tr.appendChild(val);

        table.appendChild(tr);
      }
    }

    this.content.innerHTML = '';
    this.content.appendChild(table);

    // Enable/Disable Previous/next buttons
    this.enableNavigationButtons();

    // Translate data
    super.translate();
  }

  enableNavigationButtons() {
    let previousDisplay = 'block';
    let nextDisplay = 'block';
    if (this.focusedIndex === 0) {
      previousDisplay = 'none';
    }
    if (this.focusedIndex === this.state.selectedFeatures.length - 1) {
      nextDisplay = 'none';
    }

    this.previousButton.style.display = previousDisplay;
    this.nextButton.style.display = nextDisplay;

    // Set counter text
    if (this.state.selectedFeatures.length === 1) {
      this.counterText.innerHTML = '';
    }
    else {
      this.counterText.innerHTML = (this.focusedIndex+1) + '/' + this.state.selectedFeatures.length;
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.translate();
      this.makeDraggable();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-selection-window', SelectionWindowComponent);

export default SelectionWindowComponent;
