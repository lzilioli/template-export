var _ = require( 'underscore' );
var util = require( 'lz-node-utils' );

module.exports = function( opts ) {

	// Defaults (TODO: IDK the best way to do a deep
	// extend with defaults, so for now, ugly code.)
	var modelNoop = require( '../lib/model-noop' );
	opts.model = opts.model || modelNoop;
	opts.model.init = opts.model.init || modelNoop.init;
	opts.model.getModel = opts.model.getModel || modelNoop.getModel;
	var theModel = opts.model;
	delete opts.model;

	var translatorNoop = require( '../lib/translator-noop' );
	opts.translator = opts.translator || translatorNoop;
	opts.translator.init = opts.translator.init || translatorNoop.init;
	opts.translator.translate = opts.translator.translate || translatorNoop.translate;
	var theTranslator = opts.translator;
	delete opts.translator;

	// allow each value in options.sourceFiles to be specified in any of the
	// ways that files can be passed to grunt tasks
	// should always result in keyInSourceFiles: [flat,list,of,files]
	var sourceFiles = {};
	_.each( opts.sourceFiles, function( sourceBlob, key ) {
		sourceFiles[ key ] = util.file.expand( sourceBlob );
	} );

	delete opts.sourceFiles;

	// TODO: potentially randomize the order in which these are called to enforce
	// separation of concerns. (currently, this will break one of the places im
	// using it, lolz)
	theTranslator.init( sourceFiles, opts );
	theModel.init( sourceFiles, opts );

	return function( templatePath, exportOpts ) {
		var theOptions = _.extend( {}, opts, exportOpts );
		var templateContents = templatePath && util.file.exists( templatePath ) ? util.file.read( templatePath ) : '';
		var model = theModel.getModel( theOptions, templatePath, templateContents );
		var translatedContents = theTranslator.translate( templateContents, model, theOptions, templatePath );
		return translatedContents;
	};
};
