template-export
===============

Want to use this with grunt? There's a [grunt task](http://www.github.com/lzilioli/grunt-template-export) that wraps this module.

A module, in MVC terms, a controller that acts as a near-transparent liason between a model and a view (referred to as a translator within this project). It enables the simple, yet highly custom exporting of templates (or other content) to a given destination.

The template-export module has five primary concerns:

1. initialization
2. given a path to a file:
    - fetch a model from a user-defined module
    - pass the contents of the file, along with the model, through a user-defined translation module
3. return the result of (2)
4. enforce a light-handed, yet reasonable separation between the model and the translator

The magic is in the fact that the model fetching and translation are both handled by user-defined modules that simply need to expose a pre-determined API. As long as the modules follow this API, they can do anything they need to under-the-hood in order to generate the proper output. Specifying an implementation for either of these modules is optional.

## Usage

```bash
npm install --save template-export
```


```javascript
var handlebars = require( 'handlebars' );
var fs = require( 'fs' );
var templateExport = require( 'template-export' );
var exporter = templateExport.exporter({
  /* NOTE: The opts argument passed to model.getModel, model.init,
   * translator.init, and translator.translate will contain all of
   * the options passed in except for the following 3
   * reserved keys (explained below):
   *  [ sourceFiles | translator | model ] */
  sourceFiles: {
    /* Arg for [lz-node-utils.file.expandSourceFiles](http://github.com/lzilioli-lz-node-utils)
    * The resulting object will then be passed to model.init and
    * translator.init. Those functions may do with the object what they
    * please.
    * 
    * This might be used to pass a list of markdown files
    * to your model, and a set of templates to your
    * translator for proper rendering. It's all up
    * to you.
    */
    templates: [ 'templates/**/*.tmpl' ],
    posts: [ 'blog/posts/**/*.md' ]
  },
  /* Below are the default implementations for a model and a
   * translator. If you don't provide either in the task options,
   * the default implementation will be used. Additionally,
   * if the model or translator that you provide omits one
   * of the expected functions, the task will fall back on the
   * implementations provided below for that function only. */
  model: {
    init: _.noop,
    getModel: function() { return { }; }
  },
  translator: {
    init: _.noop,
    translate: _.identity
    // _.identity is a fn that returns it's first arg
  }
});

/* The call to exporter returns a function that takes a path to a template,
 * and a options object. It will return the rendered version of the template
 * according to the translator, using the model returned by your model's
 * getModel function. */

/****** EXAMPLES ************************************/

// Get the rendered homepage, specified by src/templates/index.tmpl
var homepageExporter = templateExport({
  sourceFiles: {
      templates: [ 'templates/**/*.tmpl' ]
  },
  /* A default handlebars translator is provided. This
   * translator will automatically register all of the
   * templates specified in options.templates that pass
   * the isPartial test with handlebars with the name
   * returned by getPartialName.
   *
   * During translation, your template will be run through
   * handlebars with the designated partials registered.
   *
   * See the below "Extending the Default Translator" section
   * for an example on inheriting some of the default handlebars
   * translator's functionality. */
  translator: templateExport.translators.handlebars(
    /* You must pass handlebars as your first argument
     * (see v0.0.2 commit for v0.0.2 for an explanation) */
    handlebars.create(),
    /* The second argument is optional. It allows you to
     * specify functions to determine if a template
     * should be considered a partial (isPartial), and if so,
     * what name to register with handlebars (getPartialName)
     * If either is omitted, the default implementations
     * (shown below) will be used. */
    {
      getPartialName: function( partialPath ) {
        // The relative path of the partial from sourceDir, without the .tmpl extension
        return partialPath.replace( '.tmpl', '' );
      },
      isPartial: function( filePath ) {
        // Something is considered a partial if the filename begins with `_`
        return path.basename( filePath )[ 0 ] === '_';
      }
    }
  ),
  /* Use a static model */
  model: {
    getModel: function(){ fs.readFileSync( 'static-models/home.json' ) }
  }
});

var homepageContents = homepageExporter('src/templates/index.tmpl');
```

### Options

#### `options.sourceFiles`

-- see the *Configuring the Task* section above for an explanation of this argument

##### `options.noExpand`

If you pass this flag, sourceFiles will be used as passed in, without being expanded.

#### `options.translator`

##### `options.translator.init`

    function( sourceFiles, opts )

- return
-- none
- sourceFiles
-- see the *Configuring the Task* section above for an explanation of this argument
- opts
-- all options passed to the task except ( translator, model, sourceFiles )

##### `options.translator.translate`

    function( templateContents, model, opts, templatePath )

- return
-- string
- templateContents
-- the contents of the template being translated
- model
-- the model as returned by `options.model.getModel()`
- opts
-- all options passed to the task except ( translator, model, templates )
- templatePath
-- the path to the source template containing templateContents

#### `options.model`

##### `options.model.init`

    function( sourceFiles, opts )

- return
-- none
- sourceFiles
-- see the *Configuring the Task* section above for an explanation of this argument
- opts
-- all options passed to the task except ( translator, model, templates )

##### `options.model.getModel`

    function( opts, templatePath, templateContents )

- return
-- Object
- opts
-- all options passed to the task except ( translator, model, templates )
- templatePath
-- the path to the source template containing templateContents
- templateContents
-- the contents of the template being translated
- theTemplates
-- list of template files as passed to `options.templates`

### Extending the Default Translator

Say you want to register a set of helper functions with handlebars to make available during the export step. You can define the following translator, and pass it in the options to template-export.

```javascript
var _ = require( 'underscore' );
var handlebars = require( 'handlebars' );
var defaultTranslators = require( 'template-export' ).translators;

module.exports = function( translatorToUse, helperOverrides ) {

    var __parent = defaultTranslators.handlebars(handlebars, helperOverrides);

    var helpers = {
        siteUrl: function( siteDest ) {
            return 'http://www.example.com/' + siteDest
        }
    };

    return {
        init: function() {
            // register some additional helpers
            handlebars.registerHelper( helpers );
            __parent.init.apply( this, arguments );
        },
        translate: function() {
            return __parent.translate.apply( this, arguments );
        }
    };
};
```

# Changelog

- v0.2.2
-- rely on util.expandSourceFiles for expansion of sourceFiles argument
- v0.2.1
-- fix to allow specification of sourceFiles without the string being an array
- v0.2.0
-- change the way in which sourceFiles is specified to make it easier to deal with fully qualified paths
- v0.1.2
-- translator-handlebars strips YAML front matter from template contents prior to passing to handlebars
- v0.1.3
-- use lz-node-utils package from npm
- v0.1.4
-- correctly require yaml dependency
