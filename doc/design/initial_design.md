# DayXDay.app - Initial Design

## Overview

DayXDay.app is a mobile-friendly day planner application designed to help users manage their daily activities and schedules effectively. It is built as a Progressive Web App (PWA) to provide a seamless and engaging user experience on mobile devices.

## Key Features

- **Activity Management:** Users can add, edit, and delete activities for each day.
- **Scheduling:** Users can schedule activities for specific times.
- **Day View:** A clear and intuitive view of the day's schedule.
- **Mobile-Friendly:** Optimized for mobile devices with a responsive design.
- **Offline Access:** Leverages PWA capabilities to allow users to access and manage their schedule even when offline.
- **Notifications:** (Future) Reminders and notifications for upcoming activities.
- **Seamless Editing:** Intuitive drag-and-drop editing of the day plan.

## Technology Stack

- **Frontend Framework:** Vue.js
- **Hosting:** Hosted at https://dayxday.app
- **PWA:** Implemented as a Progressive Web App for enhanced mobile experience.

## Design Decisions

- **Vue.js:** Chosen for its simplicity, performance, and rich ecosystem, making it suitable for building a dynamic and responsive user interface.
- **PWA:** Ensures the app is fast, reliable, and engaging, providing an app-like experience on mobile devices. It also enables features like offline access and push notifications (in the future).
- **Domain:** dayxday.app is chosen to be concise and relevant to the app's purpose.

## Seamless Editing Details

- **Drag-and-Drop Resizing:**
  - Day plan items are represented as boxes, with time flowing from top to bottom.
  - Users can press/click and drag up/down on an activity to adjust its duration.
  - Adjusting an activity's duration will push subsequent activities earlier or later to accommodate the change.
- **Edge-Based Time Adjustment:**
  - Pressing/clicking on the edge between two activities will only adjust the time of that boundary, without affecting the duration of either activity.
- **Deletion:**
  - Deletion is performed by dragging an edge of an activity to make its duration zero.
  - No confirmation dialog is required for deletion.
- **Undo Functionality:**
  - Users can undo edits made within the last hour or so.

## Future Considerations

- **User Accounts:** Implementing user accounts to allow data synchronization across devices.
- **Calendar Integration:** Integrating with external calendar services.
- **Collaboration:** Allowing users to share schedules and collaborate on activities.
