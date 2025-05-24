const { useState, useEffect, useSyncExternalStore } = React;

// Initialize WebsimSocket
const room = new WebsimSocket();

function App() {
    const [inputThing, setInputThing] = useState('');
    const [antStyle, setAntStyle] = useState('realistic');
    const [isGenerating, setIsGenerating] = useState(false);

    // Subscribe to ant creations from database
    const antCreations = useSyncExternalStore(
        room.collection('ant_creation').subscribe,
        room.collection('ant_creation').getList
    );

    const handleAddAnts = async () => {
        if (!inputThing.trim() || isGenerating) return;

        setIsGenerating(true);
        
        try {
            // Use LLM to analyze and enhance the prompt
            const analysis = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are an expert at creating engaging image prompts that add ants to various objects, scenes, or concepts. 
                        Analyze the user's input and create an enhanced image generation prompt that creatively incorporates ants.
                        Consider the context, setting, and how ants would naturally or creatively interact with the subject.
                        Respond with JSON only, no other text.`
                    },
                    {
                        role: "user",
                        content: `Add ants to: "${inputThing}" in a ${antStyle} style. 
                        Create an enhanced prompt and provide creative analysis.`
                    }
                ],
                json: true
            });

            const analysisResult = JSON.parse(analysis.content);
            
            // Generate the image with enhanced prompt
            const stylePrompts = {
                realistic: "photorealistic, high detail, natural lighting",
                cartoon: "cartoon style, colorful, whimsical, animated",
                artistic: "artistic interpretation, painterly, creative composition",
                funny: "humorous, silly, comedic situation, exaggerated",
                epic: "epic scale, dramatic lighting, cinematic composition"
            };

            const fullPrompt = `${analysisResult.enhancedPrompt || `${inputThing} with ants`}, ${stylePrompts[antStyle]}, detailed, high quality`;
            
            const imageResult = await websim.imageGen({
                prompt: fullPrompt,
                aspect_ratio: "1:1"
            });

            // Store in database
            await room.collection('ant_creation').create({
                original_input: inputThing,
                style: antStyle,
                enhanced_prompt: analysisResult.enhancedPrompt || fullPrompt,
                analysis: analysisResult.analysis || "Ants creatively added to the scene",
                image_url: imageResult.url,
                prompt_used: fullPrompt
            });

            // Clear input
            setInputThing('');
            
        } catch (error) {
            console.error('Error generating ant creation:', error);
            alert('Failed to add ants! Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleAddAnts();
        }
    };

    return (
        <div className="app">
            <header className="header">
                <h1>Add Ants to Anything! 🐜</h1>
                <p>Transform any object, scene, or concept by adding our industrious ant friends!</p>
            </header>

            <section className="input-section">
                <div className="input-form">
                    <div className="input-group">
                        <div className="input-field">
                            <label htmlFor="thing-input">What should we add ants to?</label>
                            <input
                                id="thing-input"
                                type="text"
                                value={inputThing}
                                onChange={(e) => setInputThing(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="e.g., pizza, spaceship, birthday cake, forest, computer..."
                                disabled={isGenerating}
                            />
                        </div>
                        
                        <div className="input-field">
                            <label htmlFor="style-select">Ant Style</label>
                            <select
                                id="style-select"
                                value={antStyle}
                                onChange={(e) => setAntStyle(e.target.value)}
                                disabled={isGenerating}
                            >
                                <option value="realistic">Realistic</option>
                                <option value="cartoon">Cartoon</option>
                                <option value="artistic">Artistic</option>
                                <option value="funny">Funny</option>
                                <option value="epic">Epic</option>
                            </select>
                        </div>
                        
                        <button
                            className="ant-button"
                            onClick={handleAddAnts}
                            disabled={!inputThing.trim() || isGenerating}
                        >
                            {isGenerating ? 'Adding Ants...' : 'Add Ants! 🐜'}
                        </button>
                    </div>
                </div>
            </section>

            {isGenerating && (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Our ant colony is hard at work creating your image...</p>
                </div>
            )}

            <section className="gallery">
                <h2>Ant Creation Gallery 🖼️</h2>
                
                {antCreations.length === 0 ? (
                    <div className="empty-gallery">
                        <span className="ant-emoji">🐜</span>
                        <h3>No ant creations yet!</h3>
                        <p>Be the first to add ants to something amazing.</p>
                    </div>
                ) : (
                    <div className="gallery-grid">
                        {antCreations.slice().reverse().map((creation) => (
                            <GalleryItem key={creation.id} creation={creation} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function GalleryItem({ creation }) {
    return (
        <div className="gallery-item">
            <img src={creation.image_url} alt={`Ants added to ${creation.original_input}`} />
            <div className="gallery-item-info">
                <h3>Ants + {creation.original_input}</h3>
                <p><strong>Style:</strong> {creation.style}</p>
                <p><strong>Analysis:</strong> {creation.analysis}</p>
                <div className="user-info">
                    <img 
                        src={`https://images.websim.com/avatar/${creation.username}`} 
                        alt={creation.username}
                        className="user-avatar"
                    />
                    <span>by {creation.username}</span>
                </div>
                <p><small>{new Date(creation.created_at).toLocaleDateString()}</small></p>
            </div>
        </div>
    );
}

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));

