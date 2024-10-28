import SwiftUI

struct EventListView: View {
    @State private var events: [Event] = []
    @State private var showAddEvent = false

    var body: some View {
        NavigationView {
            List(events) { event in
                Text(event.title)
            }
            .navigationTitle("CrowdCal Events")
            .navigationBarItems(trailing: Button(action: {
                showAddEvent.toggle()
            }) {
                Image(systemName: "plus")
            })
            .onAppear(perform: loadEvents)
            .sheet(isPresented: $showAddEvent) {
                AddEventView { newEvent in
                    events.append(newEvent)
                    showAddEvent = false
                }
            }
        }
    }

    func loadEvents() {
        // Call your API to load events
        // For now, we will use dummy data
        events = [
            Event(id: 1, title: "Community Meeting"),
            Event(id: 2, title: "School Play"),
        ]
    }
}

struct Event: Identifiable {
    var id: Int
    var title: String
}
