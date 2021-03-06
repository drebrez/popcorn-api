// Import the neccesary modules.
import asyncq from 'async-q';
import bytes from 'bytes';

import BaseProvider from './BaseProvider';
import { movieMap } from '../configs';

/**
 * Class for scraping movie content from various sources.
 * @extends {BaseProvider}
 */
export default class MovieProvider extends BaseProvider {

  /**
   * Create a BulkProvider class.
   * @param {Object} config - The configuration object for the torrent
   * provider.
   * @param {Object} config.api - The name of api for the torrent provider.
   * @param {String} config.name - The name of the torrent provider.
   * @param {String} config.modelType - The model type for the helper.
   * @param {Object} config.query - The query object for the api.
   * @param {String} config.type - The type of content to scrape.
   */
  constructor({api, name, modelType, query, type} = {}) {
    super({api, name, modelType, query, type});
  }

  /**
   * Extract movie information based on a regex.
   * @override
   * @param {Object} torrent - The torrent to extract the movie information
   * from.
   * @param {String} [lang=en] - The language of the torrent.
   * @param {RegExp} regex - The regex to extract the movie information.
   * @returns {Object} - Information about a movie from the torrent.
   */
  _extractContent(torrent, lang = 'en', regex) {
    let movieTitle, slug;

    movieTitle = torrent.title.match(regex)[1];
    if (movieTitle.endsWith(' '))
      movieTitle = movieTitle.substring(0, movieTitle.length - 1);
    movieTitle = movieTitle.replace(/\./g, ' ');

    slug = movieTitle.replace(/[^a-zA-Z0-9 ]/gi, '')
                      .replace(/\s+/g, '-')
                      .toLowerCase();
    if (slug.endsWith('-')) slug = slug.substring(0, slug.length - 1);
    slug = slug in movieMap ? movieMap[slug] : slug;

    const year = torrent.title.match(regex)[2];
    const quality = torrent.title.match(regex)[3];

    const size = torrent.size ? torrent.size : torrent.fileSize;

    const torrentObj = {
      url: torrent.magnet ? torrent.magnet : torrent.torrent_link,
      seeds: torrent.seeds ? torrent.seeds : 0,
      peers: torrent.peers ? torrent.peers : 0,
      size: bytes(size.replace(/\s/g, '')),
      filesize: size,
      provider: this._name
    };

    const movie = {
      movieTitle,
      slug,
      slugYear: `${slug}-${year}`,
      year,
      quality,
      language: lang,
      torrents: {}
    };

    return this._attachTorrent(movie, torrentObj, quality, lang);
  }

  /**
   * Get movie info from a given torrent.
   * @override
   * @param {Object} torrent - A torrent object to extract movie information
   * from.
   * @param {String} [lang=en] - The language of the torrent.
   * @returns {Object} - Information about a movie from the torrent.
   */
  _getContentData(torrent, lang = 'en') {
    const threeDimensions = /(.*).(\d{4}).[3Dd]\D+(\d{3,4}p)/i;
    const fourKay = /(.*).(\d{4}).[4k]\D+(\d{3,4}p)/i;
    const withYear = /(.*).(\d{4})\D+(\d{3,4}p)/i;

    if (torrent.title.match(threeDimensions)) {
      return this._extractContent(torrent, lang, threeDimensions);
    } else if (torrent.title.match(fourKay)) {
      return this._extractContent(torrent, lang, fourKay);
    } else if (torrent.title.match(withYear)) {
      return this._extractContent(torrent, lang, withYear);
    }

    logger.warn(`${this._name}: Could not find data from torrent: '${torrent.title}'`);
  }

  /**
   * Create a new movie object with a torrent attached.
   * @override
   * @param {Object} movie - The movie to attach a torrent to.
   * @param {Object} torrent - The torrent object.
   * @param {String} quality - The quality of the torrent.
   * @param {String} [lang=en] - The language of the torrent
   * @returns {Object} - The movie with the newly attached torrent.
   */
  _attachTorrent(movie, torrent, quality, lang = 'en') {
    if (!movie.torrents[lang]) movie.torrents[lang] = {};
    if (!movie.torrents[lang][quality]) movie.torrents[lang][quality] = torrent;

    return movie;
  }

  /**
   * Puts all the found movies from the torrents in an array.
   * @override
   * @param {Array<Object>} torrents - A list of torrents to extract movie
   * information.
   * @param {String} [lang=en] - The language of the torrent.
   * @returns {Array<Object>} - A list of objects with movie information
   * extracted from the torrents.
   */
  _getAllContent(torrents, lang = 'en') {
    const movies = [];

    return asyncq.mapSeries(torrents, torrent => {
      if (!torrent) return null;

      const movie = this._getContentData(torrent, lang);

      if (!movie) return null;

      const { movieTitle, slug, language, quality } = movie;

      const matching = movies.find(
        m => m.movieTitle === movieTitle && m.slug === slug
      );
      if (!matching) return movies.push(movie);

      const index = movies.indexOf(matching);

      const torrentObj = movie.torrents[language][quality];
      const created = this._attachTorrent(matching, torrentObj, quality, language);

      movies.splice(index, 1, created);
    }).then(() => movies);
  }

}
