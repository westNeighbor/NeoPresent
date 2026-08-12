import StateProvider from '../../../node_modules/neo.mjs/src/state/Provider.mjs';

class ViewportStateProvider extends StateProvider {
  static config = {
    className: 'NeoPresent.viewer.ViewportStateProvider',
    data: { activeIndex: 0, maxIndex: 2 }
  };
}

export default Neo.setupClass(ViewportStateProvider);
