class State {
    title = 'GeoGirafe'
    selectedLayers = []

    constructor(title) {
        makeObservable(this, {
            title: observable,
            setTitle: action
        })
        this.title = title
    }

    setTitle(title) {
        this.title = title
    }
}
