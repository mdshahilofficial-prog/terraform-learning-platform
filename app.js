/* ============================================================ */
/* TERRAFORM LEARNING PLATFORM - MAIN APPLICATION LOGIC */
/* ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. STATE & CORE OBJECTS
    const platformApp = {
        config: {
            appTitle: "Terraform Academy",
            localStorageKeyPrefix: "terraform_academy_v1_"
        },
        data: {
            tracks: [],
            quizzes: [],
            interview: []
        },
        state: {
            activePage: "home",
            currentLessonId: null,
            theme: "dark"
        },
        progress: {
            completedLessons: new Set(),
            masteredInterviewQ: new Set(),
            completedQuizzes: new Set()
        },
        
        // 2. INITIALIZATION
        async init() {
            console.log(`${this.config.appTitle} is initializing...`);
            this.loadLocalStorage();
            this.applyTheme();
            
            try {
                // Fetch required JSON data
                await this.fetchData();
                this.renderHomePage();
                this.initPageRouter();
                this.initGlobalUIRenderers();
                this.addGlobalEventListeners();
            } catch (error) {
                console.error("Initialization error:", error);
                this.renderErrorState();
            }
        },

        // --- CORE DATA & STATE ---
        async fetchData() {
            const fetchDataFile = async (path) => {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP error fetching ${path}`);
                return response.json();
            };
            
            this.data.tracks = await fetchDataFile('data/lessons.json');
            this.data.quizzes = await fetchDataFile('data/quizzes.json');
            this.data.interview = await fetchDataFile('data/interview.json');
            
            console.log('Data loaded successfully.');
        },

        loadLocalStorage() {
            const getSavedSet = (key) => {
                const saved = localStorage.getItem(`${this.config.localStorageKeyPrefix}${key}`);
                return saved ? new Set(JSON.parse(saved)) : new Set();
            };

            this.state.theme = localStorage.getItem(`${this.config.localStorageKeyPrefix}theme`) || 'dark';
            this.progress.completedLessons = getSavedSet('lessons');
            this.progress.masteredInterviewQ = getSavedSet('interview');
            this.progress.completedQuizzes = getSavedSet('quizzes');
        },

        saveProgress() {
            const saveSet = (key, set) => {
                localStorage.setItem(`${this.config.localStorageKeyPrefix}${key}`, JSON.stringify([...set]));
            };
            
            localStorage.setItem(`${this.config.localStorageKeyPrefix}theme`, this.state.theme);
            saveSet('lessons', this.progress.completedLessons);
            saveSet('interview', this.progress.masteredInterviewQ);
            saveSet('quizzes', this.progress.completedQuizzes);
            
            this.updateOverallProgressUI();
        },

        // --- THEME ---
        applyTheme() {
            document.body.className = this.state.theme === 'dark' ? 'dark-theme' : 'light-theme';
        },
        toggleTheme() {
            this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
            this.applyTheme();
            this.saveProgress();
        },

        // --- NAVIGATION & ROUTER ---
        initPageRouter() {
            const handleHashChange = () => {
                const hash = window.location.hash || '#home';
                const [page, subId] = hash.slice(1).split('/');
                this.navigateToPage(page, subId);
            };

            window.addEventListener('hashchange', handleHashChange);
            handleHashChange(); // Run on initial load
        },

        navigateToPage(pageId, subId) {
            // Find valid pages
            const pages = document.querySelectorAll('.app-page');
            const pageFound = Array.from(pages).find(p => p.id === `${pageId}-page`);

            if (pageFound) {
                // Update navigation links
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('data-page') === pageId);
                });

                // Show/hide pages
                pages.forEach(p => p.classList.toggle('active', p === pageFound));
                this.state.activePage = pageId;
                window.scrollTo(0, 0);

                // Specific page handling
                if (pageId === 'learn') {
                    this.initLearnPage(subId);
                } else if (pageId === 'practice') {
                    this.initPracticePage();
                } else if (pageId === 'interview') {
                    this.initInterviewPage();
                } else if (pageId === 'reference') {
                    this.initReferencePage();
                } else if (pageId === 'home') {
                    this.updateHomePageProgress();
                }
            } else {
                console.error(`Page not found: ${pageId}`);
                // fallback to home?
            }
        },

        // --- GLOBAL UI ---
        initGlobalUIRenderers() {
            this.updateOverallProgressUI();
        },
        addGlobalEventListeners() {
            document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
            document.querySelector('.brand').addEventListener('click', () => window.location.hash = '#home');
        },
        updateOverallProgressUI() {
            const totalItems = this.getTotalLearningItems();
            const completedItems = this.progress.completedLessons.size + this.progress.masteredInterviewQ.size;
            
            const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
            
            const progressFillEl = document.querySelector('.progress-info .progress-fill');
            if (progressFillEl) progressFillEl.style.width = `${percentage}%`;
            
            const progressTextEl = document.getElementById('overall-progress-text');
            if (progressTextEl) progressTextEl.textContent = `${percentage}%`;
        },

        getTotalLearningItems() {
            const lessonCount = this.data.tracks.reduce((total, track) => total + track.lessons.length, 0);
            return lessonCount + this.data.interview.length;
        },

        // --- HOME PAGE LOGIC ---
        renderHomePage() {
            const roadmapContainer = document.querySelector('.roadmap-container');
            roadmapContainer.innerHTML = ''; // clear existing static HTML
            
            this.data.tracks.forEach((track, index) => {
                const completedCount = track.lessons.filter(l => this.progress.completedLessons.has(l.id)).length;
                const totalCount = track.lessons.length;
                const percentage = Math.round((completedCount / totalCount) * 100) || 0;
                
                const trackCard = document.createElement('div');
                trackCard.className = `roadmap-track ${completedCount === totalCount ? 'completed' : ''}`;
                trackCard.innerHTML = `
                    <div class="track-number">0${index + 1}</div>
                    <h3>${track.title}</h3>
                    <div class="track-progress-info">
                        <span class="lessons-completed">${completedCount} / ${totalCount} lessons</span>
                        <div class="track-progress-bar">
                            <div class="track-fill" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                `;
                
                trackCard.addEventListener('click', () => {
                    if (totalCount > 0) {
                        window.location.hash = `#learn/${track.lessons[0].id}`;
                    }
                });
                
                roadmapContainer.appendChild(trackCard);
            });
        },
        updateHomePageProgress() {
            this.renderHomePage(); // Redraw with new counts
        },

        // --- LEARN PAGE LOGIC ---
        initLearnPage(subId) {
            this.renderLearnSidebar();
            if (subId) {
                this.loadLesson(subId);
            } else {
                this.showLessonPlaceholder();
            }
        },

        renderLearnSidebar() {
            const sidebarNav = document.getElementById('lesson-navigation');
            sidebarNav.innerHTML = ''; // Clear

            this.data.tracks.forEach(track => {
                const trackEl = document.createElement('div');
                trackEl.className = 'track-nav';
                
                const trackLink = document.createElement('a');
                trackLink.className = 'track-title-link';
                trackLink.innerHTML = `<span>${track.title}</span> <span class="arrow">↓</span>`;
                trackEl.appendChild(trackLink);
                
                const lessonsList = document.createElement('div');
                lessonsList.className = 'track-lessons';
                
                track.lessons.forEach(lesson => {
                    const lessonLink = document.createElement('a');
                    lessonLink.className = `lesson-link ${lesson.id === this.state.currentLessonId ? 'active' : ''} ${this.progress.completedLessons.has(lesson.id) ? 'completed' : ''}`;
                    lessonLink.href = `#learn/${lesson.id}`;
                    lessonLink.textContent = lesson.title;
                    lessonsList.appendChild(lessonLink);
                });
                trackEl.appendChild(lessonsList);
                
                trackLink.addEventListener('click', () => {
                    trackEl.classList.toggle('active');
                });
                
                sidebarNav.appendChild(trackEl);
            });
        },

        loadLesson(lessonId) {
            this.state.currentLessonId = lessonId;
            const lesson = this.findLessonById(lessonId);
            
            if (lesson) {
                this.hideLessonPlaceholder();
                this.renderLesson(lesson);
                this.updateSidebarActiveState();
            } else {
                this.showLessonPlaceholder("Lesson not found.");
            }
        },

        renderLesson(lesson) {
            const lContent = document.querySelector('.lesson-content');
            document.getElementById('lesson-title').textContent = lesson.title;
            document.querySelector('.lesson-category').textContent = lesson.category;
            
            // Explanation
            this.setSectionText('lesson-explanation', lesson.explanation);
            this.setSectionText('lesson-mental-model', lesson.mentalModel);
            this.renderCodeExample(lesson);
            this.setSectionText('lesson-production-note', lesson.productionNote);
            
            // Mark Complete button
            const completeBtn = document.getElementById('mark-complete-btn');
            const isCompleted = this.progress.completedLessons.has(lesson.id);
            completeBtn.className = isCompleted ? "btn btn-sm btn-success" : "btn btn-sm btn-outline-success";
            completeBtn.textContent = isCompleted ? "Lesson Completed ✓" : "Mark as Complete ✓";
            
            completeBtn.onclick = () => this.handleMarkLessonComplete(lesson.id);

            // Previous/Next
            this.initLessonNavigation(lesson.id);
        },

        findLessonById(lessonId) {
            for (const track of this.data.tracks) {
                const lesson = track.lessons.find(l => l.id === lessonId);
                if (lesson) return lesson;
            }
            return null;
        },

        setSectionText(id, text) {
            const el = document.getElementById(id);
            if (text) {
                el.textContent = text;
                el.closest('.lesson-body-section').classList.remove('hidden');
            } else {
                el.closest('.lesson-body-section').classList.add('hidden');
            }
        },
        
        renderCodeExample(lesson) {
            const section = document.querySelector('.editor-body').closest('.lesson-body-section');
            if (lesson.exampleCode) {
                document.getElementById('lesson-code').textContent = lesson.exampleCode;
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        },

        updateSidebarActiveState() {
            document.querySelectorAll('.lesson-link').forEach(link => {
                const isActive = link.getAttribute('href') === `#learn/${this.state.currentLessonId}`;
                link.classList.toggle('active', isActive);
            });
            
            // Also update completed status in sidebar
            this.progress.completedLessons.forEach(completeId => {
                const link = Array.from(document.querySelectorAll('.lesson-link')).find(l => l.getAttribute('href') === `#learn/${completeId}`);
                if(link) link.classList.add('completed');
            });
        },

        handleMarkLessonComplete(lessonId) {
            if (this.progress.completedLessons.has(lessonId)) {
                this.progress.completedLessons.delete(lessonId);
            } else {
                this.progress.completedLessons.add(lessonId);
            }
            
            this.saveProgress();
            this.loadLesson(lessonId); // Reload to update button and sidebar
            this.updateSidebarActiveState(); // Update sidebar links
        },

        initLessonNavigation(currentId) {
            // Flatten all lessons
            const allLessons = this.data.tracks.flatMap(track => track.lessons);
            const currentIndex = allLessons.findIndex(l => l.id === currentId);
            
            const prevBtn = document.getElementById('prev-lesson');
            const nextBtn = document.getElementById('next-lesson');
            
            const setNavBtn = (btn, index) => {
                const lesson = allLessons[index];
                if (lesson) {
                    btn.classList.remove('hidden');
                    btn.onclick = () => window.location.hash = `#learn/${lesson.id}`;
                } else {
                    btn.classList.add('hidden');
                }
            };
            
            setNavBtn(prevBtn, currentIndex - 1);
            setNavBtn(nextBtn, currentIndex + 1);
        },

        showLessonPlaceholder(message) {
            document.getElementById('lesson-placeholder').classList.remove('hidden');
            document.getElementById('lesson-viewer').classList.add('hidden');
            if (message) document.querySelector('#lesson-placeholder p').textContent = message;
        },
        hideLessonPlaceholder() {
            document.getElementById('lesson-placeholder').classList.add('hidden');
            document.getElementById('lesson-viewer').classList.remove('hidden');
        },

        // --- PRACTICE PAGE LOGIC ---
        initPracticePage() {
            const container = document.getElementById('quiz-container');
            container.innerHTML = ''; // Clear
            
            if (this.data.quizzes.length === 0) {
                container.innerHTML = `<p class="text-center">No quizzes found.</p>`;
                return;
            }
            
            this.data.quizzes.forEach(quiz => {
                const quizCard = document.createElement('div');
                quizCard.className = 'quiz-question-card';
                
                quizCard.innerHTML = `
                    <div class="card-header">
                        <span class="quiz-id">${quiz.id} | Track: ${quiz.track}</span>
                    </div>
                    <div class="card-body">
                        <h2 class="quiz-title">${quiz.title}</h2>
                        <p class="quiz-scenario">${quiz.scenario}</p>
                        <div class="quiz-options">
                            ${quiz.options.map((opt, i) => `
                                <div class="quiz-option-link" data-index="${i}">
                                    <span class="option-marker bold">${String.fromCharCode(65 + i)}.</span>
                                    <span class="option-text">${opt.text}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="quiz-feedback" id="feedback-${quiz.id}">
                            <div class="feedback-explain"></div>
                            <button class="btn btn-sm btn-secondary reset-quiz-btn">Try again?</button>
                        </div>
                    </div>
                `;
                
                // Add event listeners to options
                quizCard.querySelectorAll('.quiz-option-link').forEach(optEl => {
                    optEl.addEventListener('click', () => this.handleQuizAnswer(optEl, quiz));
                });
                
                // Add listener to reset button
                quizCard.querySelector('.reset-quiz-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent option click
                    this.resetQuizCard(quizCard);
                });
                
                container.appendChild(quizCard);
            });
        },

        handleQuizAnswer(optionEl, quiz) {
            const card = optionEl.closest('.quiz-question-card');
            
            // Prevent multiple answers
            if (card.classList.contains('answered')) return;
            card.classList.add('answered');
            
            // Visual for selected option
            optionEl.classList.add('selected');
            
            const optionIndex = optionEl.getAttribute('data-index');
            const selectedOption = quiz.options[optionIndex];
            
            // Feedback UI
            const feedbackEl = card.querySelector('.quiz-feedback');
            const explainText = feedbackEl.querySelector('.feedback-explain');
            
            if (selectedOption.isCorrect) {
                feedbackEl.classList.add('correct');
                explainText.innerHTML = `<span class="bold">Correct! ✓</span> <br> ${selectedOption.explanation}`;
                this.progress.completedQuizzes.add(quiz.id);
            } else {
                feedbackEl.classList.add('incorrect');
                explainText.innerHTML = `<span class="bold feedback-wrong wrong">Incorrect.</span> <br> ${selectedOption.explanation}`;
            }
            
            feedbackEl.classList.remove('hidden');
            feedbackEl.style.display = 'block'; // Show it
            
            this.saveProgress();
        },

        resetQuizCard(quizCard) {
            quizCard.classList.remove('answered');
            quizCard.querySelectorAll('.quiz-option-link').forEach(optEl => {
                optEl.classList.remove('selected');
            });
            
            const feedbackEl = quizCard.querySelector('.quiz-feedback');
            feedbackEl.style.display = 'none'; // Hide it
            feedbackEl.className = 'quiz-feedback'; // reset classes
            feedbackEl.querySelector('.feedback-explain').innerHTML = '';
        },

        // --- INTERVIEW PAGE LOGIC ---
        initInterviewPage() {
            const container = document.getElementById('interview-container');
            container.innerHTML = '';
            
            if (this.data.interview.length === 0) {
                container.innerHTML = `<p class="text-center">No interview questions found.</p>`;
                return;
            }
            
            this.data.interview.forEach(q => {
                const card = document.createElement('div');
                card.className = 'interview-question-card';
                card.innerHTML = `
                    <div class="card-header">
                        <span class="quiz-id">${q.id} | Category: ${q.category}</span>
                    </div>
                    <div class="card-body">
                        <h2 class="question-text">${q.question}</h2>
                        <button class="btn btn-outline-primary reveal-answer-btn">Reveal Answer</button>
                        <div class="interview-answer-section hidden">
                            <h3>Answer</h3>
                            <p class="answer-text">${q.answer}</p>
                            ${q.productionNote ? `<div class="callout callout-production"><h3>Production Example:</h3> <p>${q.productionNote}</p></div>` : ''}
                            ${q.followUp ? `<p class="follow-up text-muted italic">Common follow-up: "${q.followUp}"</p>` : ''}
                            <button class="btn btn-sm ${this.progress.masteredInterviewQ.has(q.id) ? 'btn-success' : 'btn-outline-success'} mastered-btn">Mark as Mastered ✓</button>
                        </div>
                    </div>
                `;
                
                // Add event listeners
                card.querySelector('.reveal-answer-btn').addEventListener('click', (e) => {
                    card.querySelector('.interview-answer-section').classList.remove('hidden');
                    card.querySelector('.interview-answer-section').style.display = 'block';
                    e.target.classList.add('hidden');
                });
                
                const masteredBtn = card.querySelector('.mastered-btn');
                masteredBtn.addEventListener('click', () => {
                    this.handleMarkInterviewMastered(q.id, masteredBtn);
                });
                
                container.appendChild(card);
            });
        },

        handleMarkInterviewMastered(qId, btn) {
            if (this.progress.masteredInterviewQ.has(qId)) {
                this.progress.masteredInterviewQ.delete(qId);
                btn.className = "btn btn-sm btn-outline-success mastered-btn";
                btn.textContent = "Mark as Mastered ✓";
            } else {
                this.progress.masteredInterviewQ.add(qId);
                btn.className = "btn btn-sm btn-success mastered-btn";
                btn.textContent = "Mastered ✓";
            }
            this.saveProgress();
        },

        // --- REFERENCE PAGE LOGIC ---
        initReferencePage() {
            const resultsContainer = document.getElementById('reference-results');
            resultsContainer.innerHTML = ''; // initial clear
            
            const searchInput = document.getElementById('reference-search-input');
            
            const performSearch = (searchTerm) => {
                if (!searchTerm || searchTerm.length < 2) {
                    resultsContainer.innerHTML = '<p class="text-center text-muted col-3">Type at least 2 characters to search...</p>';
                    return;
                }
                
                searchTerm = searchTerm.toLowerCase();
                resultsContainer.innerHTML = ''; // clear results
                
                const allItems = this.flattenAllLearningItems();
                const matchedItems = allItems.filter(item => {
                    return item.title.toLowerCase().includes(searchTerm) || 
                           item.category.toLowerCase().includes(searchTerm);
                });
                
                if (matchedItems.length === 0) {
                    resultsContainer.innerHTML = `<p class="text-center text-muted col-3">No results found for "${searchTerm}".</p>`;
                    return;
                }
                
                matchedItems.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'ref-card';
                    card.innerHTML = `
                        <h3>${item.title}</h3>
                        <span class="badge badge-primary">${item.category}</span>
                        <p>${this.truncate(item.explanation || item.question || '', 100)}</p>
                    `;
                    card.addEventListener('click', () => {
                        window.location.hash = item.type === 'lesson' ? `#learn/${item.id}` : '#interview';
                    });
                    resultsContainer.appendChild(card);
                });
            };
            
            // Search events
            searchInput.addEventListener('input', (e) => performSearch(e.target.value));
            document.querySelector('.reference-search .btn').addEventListener('click', () => performSearch(searchInput.value));
        },

        flattenAllLearningItems() {
            const lessons = this.data.tracks.flatMap(track => track.lessons.map(l => ({ ...l, type: 'lesson' })));
            const interviews = this.data.interview.map(i => ({ ...i, type: 'interview', title: i.question }));
            return [...lessons, ...interviews];
        },

        truncate(text, length) {
            return text.length > length ? text.substring(0, length) + '...' : text;
        },

        // --- ERROR STATE ---
        renderErrorState() {
            document.querySelector('main').innerHTML = `
                <div class="container text-center" style="margin: 4rem auto;">
                    <h1>500: System Error</h1>
                    <p>There was a problem loading the Terraform Academy platform data. Please try refreshing the page or try again later.</p>
                </div>
            `;
        }
    };

    // 3. START APP
    platformApp.init();
});