// Import the neccesary modules.
import ApiFactory from './ApiFactory';
import HelperFactory from './HelperFactory';
import ModelFactory from './ModelFactory';

/** Class for getting a factory from the abstract factory. */
export default class FactoryProducer {

  /**
   * Get a factory class based on the name.
   * @param {String} choice - The name of the factory class.
   * @returns {Object|undefined} - A factory class.
   */
  static getFactory(choice) {
    if (!choice) return undefined;

    const c = choice.toUpperCase();

    switch (c) {
    case 'API':
      return new ApiFactory();
    case 'HELPER':
      return new HelperFactory();
    case 'MODEL':
      return new ModelFactory();
    default:
      return undefined;
    }
  }

}
