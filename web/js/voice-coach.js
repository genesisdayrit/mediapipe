/**
 * ElevenLabs Voice Coach Module
 * Provides text-to-speech functionality for fitness coaching feedback
 * Inspired by the Python implementation but adapted for web browsers
 */

export class VoiceCoach {
    constructor(apiKey, voiceId = "nPczCjzI2devNBz1zQrb") {
        this.apiKey = apiKey;
        this.voiceId = voiceId;
        this.modelId = "eleven_flash_v2_5"; // Fast, low-latency model
        this.isEnabled = true; // Voice on by default
        this.isSpeaking = false;
        this.audioQueue = [];
        this.lastFeedbackTime = 0;
        this.feedbackCooldown = 4000; // 4 seconds between feedback
        
        // Initialize feedback variations
        this.feedbackVariations = this.initializeFeedbackVariations();
        
        console.log('🎤 ElevenLabs Voice Coach initialized');
    }

    /**
     * Initialize feedback variations for dynamic coaching
     */
    initializeFeedbackVariations() {
        return {
            // Pushup feedback variations
            'pushup_rep_completed': [
                "Perfect form! That's {reps} reps!",
                "Excellent! {reps} down, keep it up!",
                "Outstanding form! {reps} reps completed!",
                "Beautiful push-up! That's {reps}!",
                "Fantastic! {reps} perfect reps!"
            ],
            
            'pushup_good_form': [
                "Perfect form! Keep it up!",
                "Excellent technique!",
                "That's how it's done!",
                "Beautiful form!",
                "Outstanding control!",
                "Perfect push-up form!"
            ],
            
            'pushup_good_depth': [
                "Good depth! Now push up strong!",
                "Perfect depth! Drive up with power!",
                "Excellent range! Now explode up!",
                "Great depth! Push through those arms!",
                "Nice low position! Now drive up!"
            ],
            
            'pushup_need_depth': [
                "Go deeper! Get that chest closer to the ground!",
                "Lower down more! Full range of motion!",
                "Deeper! Touch that chest to the floor!",
                "More depth! Get lower on the way down!",
                "Go all the way down! Full push-up!"
            ],
            
            'pushup_need_extension': [
                "Lock out those arms! Full extension!",
                "Push all the way up! Straighten those arms!",
                "Complete the rep! Arms fully extended!",
                "All the way up! Lock those elbows!",
                "Full extension! Push to the top!"
            ],
            
            // Handstand feedback variations
            'handstand_entry': [
                "Awesome! You're in a handstand!",
                "Incredible! Perfect handstand entry!",
                "Amazing balance! You're inverted!",
                "Outstanding! Handstand achieved!",
                "Fantastic! You nailed the handstand!"
            ],
            
            'handstand_exit': [
                "Nice work! Try to hold it longer next time!",
                "Great effort! Build up that hold time!",
                "Good attempt! Work on extending the hold!",
                "Well done! Keep practicing those holds!",
                "Nice try! Aim for a longer handstand next time!"
            ],
            
            'handstand_form_correction': [
                "Keep that body straight! Engage your core!",
                "Straighten that line! Core tight!",
                "Body alignment! Pull everything in line!",
                "Engage that core! Straight body position!",
                "Tighten up! Keep that perfect line!"
            ],
            
            'handstand_perfect_form': [
                "Perfect line! Hold steady!",
                "Outstanding alignment! Stay strong!",
                "Beautiful handstand! Maintain it!",
                "Incredible form! Keep it up!",
                "Perfect balance! Hold that position!"
            ],
            
            // General encouragement
            'general_encouragement': [
                "You're doing great! Keep pushing!",
                "Excellent work! Don't give up!",
                "Amazing effort! Stay focused!",
                "You've got this! Keep going!",
                "Outstanding! Push through!",
                "Incredible dedication! Keep it up!"
            ],
            
            // Milestone celebrations
            'milestone_5_reps': [
                "Five reps! You're on fire!",
                "That's five! Amazing work!",
                "Five perfect reps! Keep the momentum!",
                "Five down! You're crushing it!",
                "Five reps complete! Unstoppable!"
            ],
            
            'milestone_10_reps': [
                "Ten reps! You're a machine!",
                "Double digits! Incredible strength!",
                "Ten perfect reps! Outstanding!",
                "That's ten! You're dominating!",
                "Ten reps! Absolutely crushing it!"
            ],
            
            // Welcome and mode switch messages
            'welcome_messages': [
                "Voice coach ready! Show me your exercise form!",
                "Let's get started! Time to work on that form!",
                "Ready to coach! Let's see what you've got!",
                "Voice coach activated! Bring your best effort!",
                "I'm here to help! Let's perfect that technique!"
            ],
            
            'switch_to_pushup': [
                "Switched to pushup mode! Let's see those perfect pushups!",
                "Pushup mode activated! Time to work that upper body!",
                "Ready for pushups! Show me that perfect form!",
                "Pushup training mode! Let's build that strength!"
            ],
            
            'switch_to_handstand': [
                "Handstand mode activated! Show me that balance!",
                "Handstand training! Time to defy gravity!",
                "Balance mode on! Let's work on those handstands!",
                "Handstand practice! Show me that control!"
            ],
            
            // Test messages
            'test_messages': [
                "This is a test of the ElevenLabs voice coaching system!",
                "Voice coaching system test! Everything sounds great!",
                "Testing the voice feedback! Crystal clear!",
                "Dynamic voice coaching test! Multiple variations working!"
            ]
        };
    }

    /**
     * Get a random variation of the specified feedback type
     */
    getFeedbackVariation(feedbackType, params = {}) {
        const variations = this.feedbackVariations[feedbackType];
        if (!variations || variations.length === 0) {
            return `Keep going! ${feedbackType}`;
        }
        
        const selected = variations[Math.floor(Math.random() * variations.length)];
        
        // Replace parameters in the message
        let message = selected;
        for (const [key, value] of Object.entries(params)) {
            message = message.replace(`{${key}}`, value);
        }
        
        return message;
    }

    /**
     * Enable/disable voice coaching
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.stopAllAudio();
        }
        console.log(`🎤 Voice coaching ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Stop all audio playback
     */
    stopAllAudio() {
        this.audioQueue = [];
        this.isSpeaking = false;
        // Stop any currently playing audio
        const audioElements = document.querySelectorAll('audio[data-voice-coach]');
        audioElements.forEach(audio => {
            audio.pause();
            audio.remove();
        });
    }

    /**
     * Speak a message using ElevenLabs TTS
     */
    async speak(text, priority = false) {
        if (!this.isEnabled || !text.trim()) {
            return;
        }

        const currentTime = Date.now();
        
        // Respect cooldown for non-priority messages
        if (!priority && currentTime - this.lastFeedbackTime < this.feedbackCooldown) {
            return;
        }

        try {
            console.log(`🎤 Speaking: ${text}`);
            this.lastFeedbackTime = currentTime;
            
            if (priority) {
                this.stopAllAudio();
            }

            // Generate audio using ElevenLabs API
            const audioUrl = await this.generateAudio(text);
            if (audioUrl) {
                await this.playAudio(audioUrl);
            }
            
        } catch (error) {
            console.error('❌ Voice synthesis error:', error);
        }
    }

    /**
     * Speak a feedback variation
     */
    async speakFeedback(feedbackType, params = {}, priority = false) {
        const message = this.getFeedbackVariation(feedbackType, params);
        await this.speak(message, priority);
        return message;
    }

    /**
     * Generate audio using ElevenLabs API
     */
    async generateAudio(text) {
        try {
            console.log(`🎤 Generating audio for: "${text}" using ElevenLabs API`);
            
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: this.modelId,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.8,
                        style: 0.0,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ ElevenLabs API error: ${response.status} ${response.statusText}`, errorText);
                throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
            }

            const audioBlob = await response.blob();
            console.log(`✅ ElevenLabs audio generated: ${audioBlob.size} bytes`);
            return URL.createObjectURL(audioBlob);
            
        } catch (error) {
            console.error('❌ ElevenLabs audio generation failed:', error);
            return null;
        }
    }

    /**
     * Play audio using HTML5 Audio API
     */
    async playAudio(audioUrl) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.setAttribute('data-voice-coach', 'true');
            
            audio.onloadeddata = () => {
                this.isSpeaking = true;
                console.log('🎵 Audio loaded, starting playback');
            };
            
            audio.onended = () => {
                this.isSpeaking = false;
                URL.revokeObjectURL(audioUrl);
                audio.remove();
                console.log('✅ Audio playback completed');
                resolve();
            };
            
            audio.onerror = (error) => {
                this.isSpeaking = false;
                URL.revokeObjectURL(audioUrl);
                audio.remove();
                console.error('❌ Audio playback error:', error);
                reject(error);
            };
            
            console.log('🎵 Starting audio playback');
            audio.play().catch(error => {
                console.error('❌ Audio play() failed:', error);
                this.isSpeaking = false;
                URL.revokeObjectURL(audioUrl);
                audio.remove();
                reject(error);
            });
        });
    }

    /**
     * Process feedback from the coaching system and provide voice feedback
     */
    async processFeedback(feedback, exerciseType, repCount = 0) {
        if (!this.isEnabled) return;

        // Map existing feedback messages to voice feedback types
        const primaryFeedback = feedback.primaryFeedback || feedback.primary || '';
        const priority = feedback.priority || 'minor';
        
        // Determine voice feedback type based on primary feedback content
        let voiceFeedbackType = null;
        let params = { reps: repCount };
        
        if (primaryFeedback.includes('Perfect') || primaryFeedback.includes('Excellent')) {
            if (exerciseType === 'pushup') {
                if (repCount > 0) {
                    // Milestone celebrations
                    if (repCount === 5) voiceFeedbackType = 'milestone_5_reps';
                    else if (repCount === 10) voiceFeedbackType = 'milestone_10_reps';
                    else if (repCount % 5 === 0) voiceFeedbackType = 'pushup_rep_completed';
                    else voiceFeedbackType = 'pushup_good_form';
                } else {
                    voiceFeedbackType = 'pushup_good_form';
                }
            } else if (exerciseType === 'handstand') {
                voiceFeedbackType = 'handstand_perfect_form';
            }
        } else if (primaryFeedback.includes('depth') || primaryFeedback.includes('Lower')) {
            voiceFeedbackType = 'pushup_need_depth';
        } else if (primaryFeedback.includes('extension') || primaryFeedback.includes('arms')) {
            voiceFeedbackType = 'pushup_need_extension';
        } else if (primaryFeedback.includes('straight') || primaryFeedback.includes('alignment')) {
            if (exerciseType === 'handstand') {
                voiceFeedbackType = 'handstand_form_correction';
            }
        } else if (primaryFeedback.includes('handstand') && primaryFeedback.includes('Amazing')) {
            voiceFeedbackType = 'handstand_entry';
        }
        
        // Provide voice feedback if we have a mapped type
        if (voiceFeedbackType) {
            const isPriority = priority === 'critical' || priority === 'major';
            await this.speakFeedback(voiceFeedbackType, params, isPriority);
        } else if (Math.random() < 0.1) { // 10% chance for general encouragement
            await this.speakFeedback('general_encouragement', params, false);
        }
    }

    /**
     * Provide welcome message when analysis starts
     */
    async provideWelcomeMessage() {
        if (this.isEnabled) {
            await this.speakFeedback('welcome_messages', {}, true);
        }
    }

    /**
     * Announce exercise type change
     */
    async announceExerciseChange(exerciseType) {
        if (this.isEnabled) {
            const feedbackType = exerciseType === 'pushup' ? 'switch_to_pushup' : 'switch_to_handstand';
            await this.speakFeedback(feedbackType, {}, true);
        }
    }

    /**
     * Test voice functionality
     */
    async testVoice() {
        if (this.isEnabled) {
            console.log('🧪 Testing voice functionality...');
            await this.speak('Testing ElevenLabs voice coach integration!', true);
        }
    }

    /**
     * Debug method to test ElevenLabs API directly
     */
    async debugElevenLabs() {
        console.log('🔍 Debug: Testing ElevenLabs API connection...');
        console.log('🔑 API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT SET');
        console.log('🎤 Voice ID:', this.voiceId);
        console.log('🤖 Model ID:', this.modelId);
        
        try {
            const testText = 'Hello, this is a test message from your fitness coach!';
            console.log('📤 Sending test request to ElevenLabs API...');
            
            const audioUrl = await this.generateAudio(testText);
            if (audioUrl) {
                console.log('✅ ElevenLabs API test successful!');
                await this.playAudio(audioUrl);
            } else {
                console.log('❌ ElevenLabs API test failed - no audio generated');
            }
        } catch (error) {
            console.error('❌ ElevenLabs API debug test failed:', error);
        }
    }
} 