import SwiftUI

struct AddEventView: View {
    @State private var title: String = ""
    var onAddEvent: (Event) -> Void

    var body: some View {
        NavigationView {
            Form {
                TextField("Event Title", text: $title)
                Button("Add Event") {
                    let newEvent = Event(id: Int.random(in: 3...1000), title: title)
                    onAddEvent(newEvent)
                }
            }
            .navigationTitle("Add Event")
        }
    }
}
