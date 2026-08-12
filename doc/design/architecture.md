# Architecture

## Overview

DayXDay.app is a single-page application (SPA) built using Vue.js. It follows a component-based architecture, where the UI is broken down into reusable components. The application uses Pinia for state management and interacts with IndexedDB for local data storage.

## Components

- **App.vue:** The root component of the application.
- **DayView.vue:** Displays the activities for a given day.
- **Activity.vue:** Represents a single activity.

## Composables

- **useDragAndDrop.mts:** Handles drag-and-drop interactions for resizing and reordering activities.

## Store

- **activityStore.ts:** Manages the state of activities using Pinia. It handles loading, updating, and deleting activities.

## Data Flow
