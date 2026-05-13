import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import styles from '../../styles/AuthPage.module.css';

export function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const { pushToast } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    bio: '',
    avatar: null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSignup) {
        const payload = new FormData();
        payload.append('fullName', form.fullName);
        payload.append('email', form.email);
        payload.append('password', form.password);
        payload.append('bio', form.bio);
        if (form.avatar) {
          payload.append('avatar', form.avatar);
        }
        await signup(payload);
      } else {
        await login({ email: form.email, password: form.password });
      }

      pushToast({
        title: isSignup ? 'Account created' : 'Welcome back',
        description: 'Your workspace is ready.',
        tone: 'success',
      });
      navigate('/chat');
    } catch (error) {
      pushToast({
        title: 'Authentication failed',
        description: error.message,
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.badge}>Realtime • Secure • AI-assisted</span>
          <h1>Professional conversations with the speed of live collaboration.</h1>
          <p>
            A premium MERN chat workspace with smart summaries, presence indicators,
            media sharing, and clean mobile-first ergonomics.
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <h2>{isSignup ? 'Create account' : 'Sign in'}</h2>
            <p>{isSignup ? 'Launch your team-ready chat hub.' : 'Access your secure workspace.'}</p>
          </div>

          {isSignup ? (
            <>
              <label className={styles.field}>
                <span>Full name</span>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Alex Morgan"
                />
              </label>
              <label className={styles.field}>
                <span>Bio</span>
                <textarea
                  rows="3"
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                  placeholder="Product designer who ships quickly."
                />
              </label>
              <label className={styles.field}>
                <span>Profile picture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.files?.[0] || null }))}
                />
              </label>
            </>
          ) : null}

          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="alex@company.com"
            />
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              required
              minLength="6"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your secure password"
            />
          </label>

          <button className={styles.submit} disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
          </button>

          <p className={styles.switch}>
            {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create one'}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
