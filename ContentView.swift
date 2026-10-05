import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: TaskStore
    @StateObject private var speech = SpeechManager()
    @State private var showingAdd = false
    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                if store.tasks.isEmpty { ContentUnavailableView("Справ поки немає", systemImage: "checklist", description: Text("Натисніть мікрофон і скажіть, що потрібно зробити.")) }
                else { List { ForEach(store.tasks) { item in Button { store.toggle(item) } label: { HStack { Image(systemName: item.isDone ? "checkmark.circle.fill" : "circle"); VStack(alignment:.leading) { Text(item.title).strikethrough(item.isDone); if let d=item.dueDate { Text(d, style:.date).font(.caption).foregroundStyle(.secondary); Text(d, style:.time).font(.caption).foregroundStyle(.secondary) } } } }.buttonStyle(.plain) }.onDelete(perform: store.delete) } }
                Button { Task { if speech.listening { speech.stop() } else { await speech.start() } } } label: { Label(speech.listening ? "Слухаю…" : "Сказати завдання", systemImage: speech.listening ? "stop.circle.fill" : "mic.circle.fill").font(.title2).frame(maxWidth:.infinity).padding() }.buttonStyle(.borderedProminent).padding(.horizontal)
                if !speech.text.isEmpty { VStack { Text(speech.text).frame(maxWidth:.infinity,alignment:.leading); Button("Створити завдання") { let p=NaturalLanguageParser.parse(speech.text); store.add(TaskItem(title:p.title,dueDate:p.date)); speech.text="" } }.padding() }
            }
            .navigationTitle("RV Plan")
            .toolbar { Button { showingAdd=true } label: { Image(systemName:"plus") } }
            .sheet(isPresented:$showingAdd) { AddTaskView() }
        }
    }
}

struct AddTaskView: View {
    @EnvironmentObject var store: TaskStore
    @Environment(\.dismiss) var dismiss
    @State private var title=""; @State private var date=Date().addingTimeInterval(3600); @State private var remind=true; @State private var category="Особисте"
    var body: some View { NavigationStack { Form { TextField("Що зробити?",text:$title); Picker("Категорія",selection:$category) { ForEach(["RVMOVE","Revere Valour","Документи","Особисте"],id:\.self){Text($0)} }; Toggle("Нагадати",isOn:$remind); if remind { DatePicker("Дата і час",selection:$date) } } .navigationTitle("Нова справа").toolbar { ToolbarItem(placement:.cancellationAction){Button("Скасувати"){dismiss()}}; ToolbarItem(placement:.confirmationAction){Button("Зберегти"){ guard !title.trimmingCharacters(in:.whitespaces).isEmpty else{return}; store.add(TaskItem(title:title,dueDate:remind ? date:nil,category:category)); dismiss() } } } } }
}
