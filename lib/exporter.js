var _ = require( 'underscore' );
var util = require( 'lz-node-utils' );
var path = require( 'path' );

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

	// opts.sourceFiles can either be
	// key: [ fileGlob ]
	// or
	// key: {
	// 		cwd: ''
	//		src: [ fileGlob ]
	// }
	// If the latter, the cwd part fo the file's paths won't be exposed to the
	// translators or models

	var sourceFiles = {};

	_.each( _.keys( opts.sourceFiles ), function( key ) {

		var sourceFileOpts = opts.sourceFiles[ key ];

		// if a cwd is specified, capture it now
		var cwd = ( sourceFileOpts.cwd ? sourceFileOpts.cwd : '' );
		if ( cwd[ cwd.length - 1 ] !== '/' ) {
			cwd = cwd + '/';
		}

		// Get a list of the files that match the sourceFileOpts
		var fileList = [];
		if ( _.isArray( sourceFileOpts ) ) {
			fileList = util.file.expand( sourceFileOpts );
		} else {
			if ( !_.isArray( sourceFileOpts.src ) ) {
				sourceFileOpts.src = [ sourceFileOpts.src ];
			}
			_.each( sourceFileOpts.src, function( src ) {
				var globPattern = path.join( cwd, src );
				fileList.push( util.file.expand( globPattern ) );
			} );
		}

		fileList = _.flatten( fileList );

		sourceFiles[ key ] = _.map( fileList, function( fqp ) {
			var fileContents = util.file.read( fqp );
			var filePath = fqp.replace( cwd, '' );
			return {
				fqp: fqp,
				path: filePath,
				contents: fileContents
			};
		} );

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
		templateContents = util.stripYamlFront( templateContents );
		var model = theModel.getModel( theOptions, templatePath, templateContents );
		var translatedContents = theTranslator.translate( templateContents, model, theOptions, templatePath );
		return translatedContents;
	};
};
