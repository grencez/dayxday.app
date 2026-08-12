# Variable Style

## Naming

For new code, use the following naming conventions.

### Local variables use snake case

Even though functions use camel case, put underscores between words for local variables.

### Data members use snake case

Class data members are like local variables, so they should use snake case as well.

Private data members should end with an underscore.
This is similar to Google's C++ style.

### Classes are singularized

Never pluralize a class or struct name.

### Arrays are pluralized

The reason for this is that we already know that directories contain multiple files and files contain multiple things.

### Dictionaries are value by key

When using a dictionary or map, make it obvious what both the value and key are supposed to hold.
For example, if we have a dictionary that holds activities keyed by ID, we should name it `activity_by_id`.

### Boolean settings are on

Always suffix a boolean setting with `_on` to denote its type.
This encourages its name to reflect how it will be interpreted.
You can use this convention for other booleans as well, but it's not mandatory.
