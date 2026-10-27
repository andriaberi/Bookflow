import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './includes/navbar';
import Footer from './includes/footer';
import Home from './pages/home';
import Convert from './pages/convert';
import Reading from './pages/reading';
import Contact from './pages/contact';
import Editor from './pages/editor';
import Library from './pages/library';
import LibraryBook from './pages/library-book';
import Suggest from './pages/suggest';
import NotFound from './pages/not-found';

function App() {
    const { pathname } = useLocation();

    // A new page starts at the top, as it would on a site without client-side routing.
    useEffect(() => {
        document.documentElement.scrollTop = 0;
    }, [pathname]);

    return (
        <div className="bf">
            <Navbar />
            <main className="bf-main">
                <div className="bf-page" key={ pathname }>
                    <Routes>
                        <Route path="/" element={ <Home /> } />
                        <Route path="/convert" element={ <Convert /> } />
                        <Route path="/convert/:id" element={ <Reading /> } />
                        <Route path="/convert/:id/edit" element={ <Editor /> } />
                        <Route path="/library" element={ <Library /> } />
                        <Route path="/library/:id" element={ <LibraryBook /> } />
                        <Route path="/suggest" element={ <Suggest /> } />
                        <Route path="/contact" element={ <Contact /> } />
                        <Route path="*" element={ <NotFound /> } />
                    </Routes>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default App;
