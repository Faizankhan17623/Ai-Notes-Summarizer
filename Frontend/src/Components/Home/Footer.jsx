import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaTwitter, FaGithub, FaLinkedin, FaArrowRight } from 'react-icons/fa'
import { NAV_MENUS } from './navMenuData.js'

const USEFUL_LINKS = [
    { title: 'Contact Us', href: 'mailto:faizankhan901152@gmail.com' },
    { title: 'Privacy Policy', href: '/PrivacyPolicy' },
    { title: 'Terms of Service', href: '/TermsOfService' },
]

const COMPANY_LINKS = [
    { title: 'About', href: '#' },
    { title: 'Careers', href: '#' },
    { title: 'Affiliate Program', href: '#' },
]

const SUPPORT_LINKS = [
    { title: 'Help Center', href: '/HelpCenter' },
    { title: 'FAQs', href: '/Resources' },
]

const SOCIAL_LINKS = [
    { icon: FaTwitter, href: '#', label: 'Twitter' },
    { icon: FaGithub, href: '#', label: 'GitHub' },
    { icon: FaLinkedin, href: '#', label: 'LinkedIn' },
]

const FooterColumn = ({ title, links }) => (
    <div>
        <h3 className="text-richblack-5 font-semibold text-sm mb-3">{title}</h3>
        <ul className="space-y-2">
            {links.map((link) => (
                <li key={link.title}>
                    {link.href.startsWith('mailto:') ? (
                        <a href={link.href} className="text-richblack-300 hover:text-richblack-5 text-sm transition-colors">
                            {link.title}
                        </a>
                    ) : (
                        <Link to={link.href} className="text-richblack-300 hover:text-richblack-5 text-sm transition-colors">
                            {link.title}
                        </Link>
                    )}
                </li>
            ))}
        </ul>
    </div>
)

const Footer = () => {
    const { token } = useSelector((state) => state.auth)
    const featureLinks = NAV_MENUS.find((menu) => menu.label === 'Features').items.map((item) => ({
        title: item.title,
        href: item.href,
    }))
    const solutionLinks = NAV_MENUS.find((menu) => menu.label === 'Solutions').items.map((item) => ({
        title: item.title,
        href: item.href,
    }))
    const resourceLinks = NAV_MENUS.find((menu) => menu.label === 'Resources').items.map((item) => ({
        title: item.title,
        href: item.href,
    }))

    return (
        <footer className="w-full border-t border-border-soft">
            {/* CTA banner */}
            <div className="bg-violet-500 text-white">
                <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <h2 className="font-display text-2xl md:text-3xl font-semibold text-center md:text-left">
                        Turn your notes into a summary in seconds.
                    </h2>
                    <Link
                        to={token ? "/Dashboard/New-Summary" : "/Signup"}
                        className="inline-flex items-center gap-2 bg-white text-violet-600 px-6 py-3 rounded-md font-semibold hover:scale-95 transition-all shrink-0"
                    >
                        {token ? "Summarize your notes" : "Get started for free"} <FaArrowRight size={14} />
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="grid md:grid-cols-8 gap-8">
                    <div className="md:col-span-2">
                        <Link to="/" className="font-display text-xl font-semibold text-yellow-50">
                            Notewise
                        </Link>
                        <p className="text-richblack-300 text-sm mt-3 max-w-xs leading-relaxed">
                            The AI study tool for faster, more effective learning.
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                            {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    aria-label={label}
                                    className="text-richblack-300 hover:text-richblack-5 hover:bg-surface-hover border border-border-soft rounded-md p-2 transition-colors"
                                >
                                    <Icon size={14} />
                                </a>
                            ))}
                        </div>
                    </div>

                    <FooterColumn title="Useful Links" links={USEFUL_LINKS} />
                    <FooterColumn title="Features" links={featureLinks} />
                    <FooterColumn title="Solutions" links={solutionLinks} />
                    <FooterColumn title="Resources" links={resourceLinks} />
                    <FooterColumn title="Support" links={SUPPORT_LINKS} />
                    <FooterColumn title="Company" links={COMPANY_LINKS} />
                </div>

                <div className="border-t border-border-soft mt-8 pt-4">
                    <p className="text-richblack-400 text-sm">
                        © {new Date().getFullYear()} Notewise. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
