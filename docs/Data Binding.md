# Rive Runtime Fundamentals — Data Binding

Connect your runtime code to editor-bound elements using **View Models**.

---

## Overview

Before using Rive’s runtime data binding APIs, make sure you understand the core concepts:

- View Models
- View Model Instances
- Properties & Bindings
- Auto-binding vs Manual binding
- Observability
- Advanced property types (Images, Lists, Artboards, Enums)

---

## Data Binding Concepts

Data Binding allows runtime code to read, write, and observe values that are bound to elements inside a Rive file.

Key ideas:

- **View Models** define a schema (properties only).
- **View Model Instances** hold actual runtime values.
- Bindings are authored in the editor, but driven at runtime.
- Changes propagate when the **state machine or artboard advances**.

---

## Quick Start

1. Open a `.riv` file
2. Load it via the Rive runtime
3. Access a **View Model**
4. Create or retrieve a **View Model Instance**
5. Bind it to a **State Machine or Artboard**
6. Read / write properties at runtime

---

## View Models

A **View Model** describes a set of properties but **cannot store values itself**.

You access view models from a loaded Rive file or Rive instance.

### Accessing View Models (Web / JS)

```js
const rive = new rive.Rive({
  onLoad: () => {
    // Rive is ready
  }
});

By Name

const namedVM = rive.viewModelByName("My View Model");

By Index

for (let i = 0; i < rive.viewModelCount; i++) {
  const indexedVM = rive.viewModelByIndex(i);
}

Default View Model

const defaultVM = rive.defaultViewModel();

From the RiveFile directly

const namedVM = file.viewModelByName("My View Model");
const indexedVM = file.viewModelByIndex(0);
const defaultVM = file.defaultArtboardViewModel(artboard);


⸻

View Model Instances

A View Model Instance (VMI) holds the actual runtime values.

Ways to Create Instances

Method	Description
Blank instance	Uses default primitive values
Default instance	Uses the editor-defined “Default” instance
By index	Iterate through available instances
By name	Fetch a specific editor instance

Blank Instance Defaults

Type	Default
Number	0
String	""
Boolean	false
Color	0xFF000000
Trigger	Untriggered
Enum	First enum value
Nested VM	null

Creating Instances

const vmiBlank = viewModel.instance();
const vmiDefault = viewModel.defaultInstance();

for (let i = 0; i < viewModel.instanceCount; i++) {
  const vmiIndexed = viewModel.instanceByIndex(i);
}

const vmiNamed = viewModel.instanceByName("My Instance");


⸻

Binding Instances

Preferred: Bind to a State Machine

Binding to a state machine automatically applies the instance to the artboard.

Only bind directly to the artboard if:
	•	No state machine is used
	•	The file is static or uses only linear animations

Manual Binding

const rive = new rive.Rive({
  autoBind: false,
  onLoad: () => {
    const vm = rive.viewModelByName("My View Model");
    const vmi = vm.instanceByName("My Instance");

    rive.bindViewModelInstance(vmi);
  }
});

Initial values do not apply until the state machine or artboard advances.

⸻

Auto-Binding

Auto-binding:
	•	Uses the default View Model
	•	Uses the Default instance
	•	Automatically binds to both state machine and artboard

const rive = new rive.Rive({
  src: "my_rive_file.riv",
  canvas: document.getElementById("canvas"),
  autoBind: true,
  onLoad: () => {
    const boundInstance = rive.viewModelInstance;
  }
});


⸻

Properties

Properties live on View Model Instances, not View Models.

Supported Property Types

Type	Supported
Number	✅
Boolean	✅
Trigger	✅
String	✅
Enum	✅
Color	✅
Nested View Models	✅
Lists	✅
Images	✅
Artboards	✅

Inspect Property Descriptors

const properties = viewModel.properties;
console.log(properties);


⸻

Reading & Writing Properties

const vmi = rive.viewModelInstance;

// Boolean
const boolProp = vmi.boolean("My Boolean Property");
boolProp.value = true;

// String
const strProp = vmi.string("My String Property");
strProp.value = "Hello, Rive!";

// Number
const numProp = vmi.number("My Number Property");
numProp.value = 10;

// Color
const colorProp = vmi.color("My Color Property");
colorProp.rgb(255, 0, 0);
colorProp.opacity(0.5);

// Trigger
vmi.trigger("My Trigger Property").trigger();

// Enum
vmi.enum("My Enum Property").value = "Option1";


⸻

Nested Property Paths

View Models can be nested arbitrarily.

Chained Access

vmi
  .viewModel("My Nested View Model")
  .viewModel("My Second Nested VM")
  .number("My Nested Number");

Path Access

vmi.number("My Nested View Model/My Second Nested VM/My Nested Number");


⸻

Observability

You can observe property changes after bindings are applied.

Add Observer

const numberProperty = vmi.number("My Number Property");

numberProperty.on((event) => {
  console.log(event.data);
});

Remove Observers

numberProperty.off();     // Remove all observers
numberProperty.off(fn);   // Remove a specific observer

Observing trigger properties is a lightweight alternative to Rive Events.

⸻

Image Properties

Image properties allow per-instance raster image replacement.

Example

const randomImageAsset = async (imageProperty) => {
  const res = await fetch("https://picsum.photos/300/500");
  const image = await rive.decodeImage(
    new Uint8Array(await res.arrayBuffer())
  );

  imageProperty.value = image;
  image.unref();
};

const imageProperty = vmi.image("bound_image");
randomImageAsset(imageProperty);
imageProperty.value = null; // Clear image


⸻

List Properties

List properties manage dynamic collections of View Model Instances.

Supported Operations
	•	Add instance
	•	Remove instance
	•	Remove by index
	•	Swap instances
	•	Get list length

Example

const list = vmi.list("todos");

const todoVM = rive.viewModelByName("TodoItem");
const todo = todoVM.instance();
todo.string("description").value = "Buy groceries";

list.addInstance(todo);
list.removeInstance(todo);
list.swap(0, 1);
list.removeInstanceAt(0);


⸻

Artboard Properties

Artboard properties allow swapping entire components at runtime.

Common Use Cases
	•	Character skinning systems
	•	Modular UI composition
	•	Lazy-loading complex scenes

Example

const artboardProperty = vmi.artboard("Artboard property");
artboardProperty.value = characterArtboard;


⸻

Enums

Enums are string-based and defined in the Rive file.
	•	System enums: Editor dropdowns
	•	User-defined enums: Designer-created enum sets

Inspect Enums

const enums = rive.enums();
console.log(enums);


⸻

Final Notes
	•	Prefer state machine binding
	•	Auto-bind is ideal for simple setups
	•	Manual binding provides maximum control
	•	Property changes apply only after advance
	•	Lists and Artboards unlock powerful composition patterns


```
