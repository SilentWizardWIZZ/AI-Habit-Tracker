function MainComponent() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState("daily");
  const [suggestions, setSuggestions] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState("");

  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: (message) => {
      setSuggestions((prev) => [
        ...prev,
        { suggestion: message, created_at: new Date().toISOString() },
      ]);
      setStreamingMessage("");
    },
  });

  // Fetch habits
  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const response = await fetch("/api/list-habits", { method: "POST" });
        if (!response.ok) {
          throw new Error("Failed to fetch habits");
        }
        const data = await response.json();
        setHabits(data.habits);
      } catch (err) {
        console.error(err);
        setError("Could not load your habits");
      } finally {
        setLoading(false);
      }
    };
    fetchHabits();
  }, []);

  // Get AI suggestions
  const getAISuggestions = async () => {
    try {
      const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI assistant that provides personalized habit suggestions. Keep suggestions short, practical, and motivating.",
            },
            {
              role: "user",
              content: `Based on my current habits: ${habits.map((h) => h.name).join(", ")}, suggest a new healthy habit I could add to improve my routine. Keep it brief and specific.`,
            },
          ],
          stream: true,
        }),
      });
      handleStreamResponse(response);
    } catch (err) {
      console.error(err);
      setError("Could not get AI suggestions");
    }
  };

  // Add new habit
  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      const response = await fetch("/api/create-habit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHabitName,
          frequency: newHabitFrequency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create habit");
      }

      const data = await response.json();
      setHabits((prev) => [...prev, data.habit]);
      setNewHabitName("");
    } catch (err) {
      console.error(err);
      setError("Could not create the habit");
    }
  };

  // Log habit completion
  const logHabit = async (habitId) => {
    try {
      const response = await fetch("/api/log-habit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      });

      if (!response.ok) {
        throw new Error("Failed to log habit");
      }

      // Refresh habits list after logging
      const updatedResponse = await fetch("/api/list-habits", {
        method: "POST",
      });
      if (!updatedResponse.ok) {
        throw new Error("Failed to refresh habits");
      }
      const data = await updatedResponse.json();
      setHabits(data.habits);
    } catch (err) {
      console.error(err);
      setError("Could not log the habit");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-md mx-auto">
          <p className="text-center text-gray-600">Loading your habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center">
          AI Habit Tracker
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {/* Add New Habit Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Habit</h2>
          <form onSubmit={addHabit} className="space-y-4">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Enter habit name"
              className="w-full p-2 border rounded"
            />
            <select
              value={newHabitFrequency}
              onChange={(e) => setNewHabitFrequency(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Add Habit
            </button>
          </form>
        </div>

        {/* Current Habits */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Habits</h2>
          {habits.length === 0 ? (
            <p className="text-gray-500">No habits yet. Add one above!</p>
          ) : (
            <div className="space-y-4">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <h3 className="font-medium">{habit.name}</h3>
                    <p className="text-sm text-gray-500">{habit.frequency}</p>
                  </div>
                  <button
                    onClick={() => logHabit(habit.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Complete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">AI Suggestions</h2>
            <button
              onClick={getAISuggestions}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Get Suggestions
            </button>
          </div>

          {streamingMessage && (
            <div className="p-3 bg-purple-50 rounded mb-3">
              <p className="text-purple-700">{streamingMessage}</p>
            </div>
          )}

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 bg-purple-50 rounded">
                <p className="text-purple-700">{suggestion.suggestion}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(suggestion.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



