import { Routes, Route } from 'react-router-dom';
import Navbar from './includes/navbar';
import Footer from './includes/footer';
import Home from './pages/home';
import Convert from './pages/convert';
import Reading from './pages/reading';
import Editor from './pages/editor';
import Library from './pages/library';
import LibraryBook from './pages/library-book';
import Suggest from './pages/suggest';
import Support from './pages/support';
import NotFound from './pages/not-found';

function App() {
    return (
        <div className="bf">
            <Navbar />
            <main className="bf-main">
                <Routes>
                    <Route path="/" element={ <Home /> } />
                    <Route path="/convert" element={ <Convert /> } />
                    <Route path="/convert/:id" element={ <Reading /> } />
                    <Route path="/convert/:id/edit" element={ <Editor /> } />
                    <Route path="/library" element={ <Library /> } />
                    <Route path="/library/:id" element={ <LibraryBook /> } />
                    <Route path="/suggest" element={ <Suggest /> } />
                    <Route path="/support" element={ <Support /> } />
                    <Route path="*" element={ <NotFound /> } />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
