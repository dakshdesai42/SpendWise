import UIKit
import Capacitor
import WebKit
import ObjectiveC.runtime

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var didConfigureRootWebView = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window?.backgroundColor = .black
        DispatchQueue.main.async { [weak self] in
            self?.configureRootWebView()
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Re-apply tuning after lifecycle transitions (keyboard/orientation/background).
        configureRootWebView()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    private func configureRootWebView() {
        guard !didConfigureRootWebView else { return }

        guard
            let rootView = window?.rootViewController?.view,
            let webView = findWebView(in: rootView)
        else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                self?.configureRootWebView()
            }
            return
        }

        didConfigureRootWebView = true

        webView.backgroundColor = .black
        webView.isOpaque = false

        let scrollView = webView.scrollView
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.keyboardDismissMode = .interactive
        scrollView.contentInset = .zero
        scrollView.scrollIndicatorInsets = .zero
    }

    private func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView {
            return webView
        }
        for subview in view.subviews {
            if let webView = findWebView(in: subview) {
                return webView
            }
        }
        return nil
    }

}

private enum SpendWiseTabItem: String, CaseIterable {
    case dashboard = "/dashboard"
    case expenses = "/expenses"
    case budgets = "/budgets"
    case settings = "/settings"

    var title: String {
        switch self {
        case .dashboard: return "Home"
        case .expenses: return "Expenses"
        case .budgets: return "Budgets"
        case .settings: return "Settings"
        }
    }

    var symbolName: String {
        switch self {
        case .dashboard: return "house.fill"
        case .expenses: return "creditcard.fill"
        case .budgets: return "chart.pie.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

class SpendWiseBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private let routeHandlerName = "spendwiseRoute"
    private let modalHandlerName = "spendwiseModal"
    private var attachedMessageHandlers = false
    private weak var routeUserContentController: WKUserContentController?

    private var tabContainerView: UIView?
    private var tabButtons: [SpendWiseTabItem: UIButton] = [:]
    private var selectedTab: SpendWiseTabItem = .dashboard
    private var isTabBarHiddenForKeyboard = false
    private var isTabBarHiddenForModal = false
    private var isTabBarHiddenForRoute = false
    private var isTabBarCurrentlyHidden = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureRootWebView()
        setupNativeTabBar()
        observeKeyboardVisibility()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        attachMessageHandlersIfNeeded()
    }

    deinit {
        if attachedMessageHandlers {
            routeUserContentController?.removeScriptMessageHandler(forName: routeHandlerName)
            routeUserContentController?.removeScriptMessageHandler(forName: modalHandlerName)
        }
        NotificationCenter.default.removeObserver(self)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case routeHandlerName:
            handleRouteMessage(message.body)
        case modalHandlerName:
            handleModalMessage(message.body)
        default:
            break
        }
    }

    private func configureRootWebView() {
        guard let webView = bridge?.webView else { return }
        webView.backgroundColor = .black
        webView.isOpaque = false

        let scrollView = webView.scrollView
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.keyboardDismissMode = .interactive
        scrollView.contentInset = .zero
        scrollView.scrollIndicatorInsets = .zero
    }

    private func attachMessageHandlersIfNeeded() {
        guard !attachedMessageHandlers, let webView = bridge?.webView else { return }
        let userContentController = webView.configuration.userContentController
        userContentController.removeScriptMessageHandler(forName: routeHandlerName)
        userContentController.removeScriptMessageHandler(forName: modalHandlerName)
        userContentController.add(self, name: routeHandlerName)
        userContentController.add(self, name: modalHandlerName)
        routeUserContentController = userContentController
        attachedMessageHandlers = true
    }

    private func setupNativeTabBar() {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = .clear
        container.layer.zPosition = 999
        view.addSubview(container)
        tabContainerView = container

        NSLayoutConstraint.activate([
            container.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            container.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),
            container.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -6),
            container.heightAnchor.constraint(equalToConstant: 84),
        ])

        let materialView = UIVisualEffectView(effect: makeLiquidTabEffect())
        materialView.translatesAutoresizingMaskIntoConstraints = false
        materialView.clipsToBounds = true
        materialView.layer.cornerRadius = 26
        materialView.layer.cornerCurve = .continuous
        materialView.layer.borderColor = UIColor.white.withAlphaComponent(0.22).cgColor
        materialView.layer.borderWidth = 1
        container.addSubview(materialView)

        NSLayoutConstraint.activate([
            materialView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            materialView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            materialView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            materialView.heightAnchor.constraint(equalToConstant: 64),
        ])

        let sheen = SheenOverlayView()
        sheen.translatesAutoresizingMaskIntoConstraints = false
        sheen.isUserInteractionEnabled = false
        materialView.contentView.addSubview(sheen)

        NSLayoutConstraint.activate([
            sheen.leadingAnchor.constraint(equalTo: materialView.contentView.leadingAnchor),
            sheen.trailingAnchor.constraint(equalTo: materialView.contentView.trailingAnchor),
            sheen.topAnchor.constraint(equalTo: materialView.contentView.topAnchor),
            sheen.bottomAnchor.constraint(equalTo: materialView.contentView.bottomAnchor),
        ])

        let leftStack = UIStackView()
        leftStack.translatesAutoresizingMaskIntoConstraints = false
        leftStack.axis = .horizontal
        leftStack.spacing = 4
        leftStack.distribution = .fillEqually

        let rightStack = UIStackView()
        rightStack.translatesAutoresizingMaskIntoConstraints = false
        rightStack.axis = .horizontal
        rightStack.spacing = 4
        rightStack.distribution = .fillEqually

        materialView.contentView.addSubview(leftStack)
        materialView.contentView.addSubview(rightStack)

        NSLayoutConstraint.activate([
            leftStack.leadingAnchor.constraint(equalTo: materialView.contentView.leadingAnchor, constant: 8),
            leftStack.centerYAnchor.constraint(equalTo: materialView.contentView.centerYAnchor),
            leftStack.trailingAnchor.constraint(equalTo: materialView.contentView.centerXAnchor, constant: -36),
            leftStack.heightAnchor.constraint(equalToConstant: 52),

            rightStack.leadingAnchor.constraint(equalTo: materialView.contentView.centerXAnchor, constant: 36),
            rightStack.centerYAnchor.constraint(equalTo: materialView.contentView.centerYAnchor),
            rightStack.trailingAnchor.constraint(equalTo: materialView.contentView.trailingAnchor, constant: -8),
            rightStack.heightAnchor.constraint(equalToConstant: 52),

            leftStack.widthAnchor.constraint(equalTo: rightStack.widthAnchor),
        ])

        let tabOrder: [SpendWiseTabItem] = [.dashboard, .expenses, .budgets, .settings]
        for (index, item) in tabOrder.enumerated() {
            let button = makeTabButton(for: item)
            tabButtons[item] = button
            if index < 2 {
                leftStack.addArrangedSubview(button)
            } else {
                rightStack.addArrangedSubview(button)
            }
        }

        let addButton = UIButton(type: .system)
        addButton.translatesAutoresizingMaskIntoConstraints = false
        addButton.setImage(UIImage(systemName: "plus", withConfiguration: UIImage.SymbolConfiguration(pointSize: 27, weight: .bold)), for: .normal)
        addButton.tintColor = .white
        addButton.backgroundColor = UIColor.systemBlue
        addButton.layer.cornerRadius = 28
        addButton.layer.cornerCurve = .continuous
        addButton.layer.borderWidth = 1
        addButton.layer.borderColor = UIColor.white.withAlphaComponent(0.38).cgColor
        addButton.layer.shadowColor = UIColor.systemBlue.cgColor
        addButton.layer.shadowOpacity = 0.45
        addButton.layer.shadowRadius = 12
        addButton.layer.shadowOffset = CGSize(width: 0, height: 8)
        addButton.addAction(UIAction { [weak self] _ in
            self?.sendAddExpenseEventToWeb()
        }, for: .touchUpInside)
        container.addSubview(addButton)

        NSLayoutConstraint.activate([
            addButton.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            addButton.centerYAnchor.constraint(equalTo: materialView.topAnchor),
            addButton.heightAnchor.constraint(equalToConstant: 56),
            addButton.widthAnchor.constraint(equalTo: addButton.heightAnchor),
        ])

        updateSelectedTab(.dashboard)
    }

    private func makeTabButton(for item: SpendWiseTabItem) -> UIButton {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.layer.cornerRadius = 14
        button.layer.cornerCurve = .continuous
        button.clipsToBounds = true

        var config = UIButton.Configuration.plain()
        config.title = item.title
        config.image = UIImage(systemName: item.symbolName)
        config.imagePlacement = .top
        config.imagePadding = 2
        config.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8)
        config.baseForegroundColor = UIColor.white.withAlphaComponent(0.72)
        config.attributedTitle = AttributedString(item.title, attributes: AttributeContainer([
            .font: UIFont.systemFont(ofSize: 11, weight: .semibold)
        ]))
        button.configuration = config

        button.addAction(UIAction { [weak self] _ in
            self?.handleNativeTabTap(item)
        }, for: .touchUpInside)
        return button
    }

    private func makeLiquidTabEffect() -> UIVisualEffect {
        if let dynamicGlass = makeDynamicGlassEffect() {
            return dynamicGlass
        }

        if #available(iOS 15.0, *) {
            return UIBlurEffect(style: .systemUltraThinMaterialDark)
        }
        return UIBlurEffect(style: .dark)
    }

    private func makeDynamicGlassEffect() -> UIVisualEffect? {
        guard let glassClass = NSClassFromString("UIGlassEffect") else { return nil }
        let selectors = [
            NSSelectorFromString("effect"),
            NSSelectorFromString("defaultEffect"),
            NSSelectorFromString("regularEffect"),
        ]

        for selector in selectors {
            guard let method = class_getClassMethod(glassClass, selector) else { continue }
            typealias EffectFactory = @convention(c) (AnyClass, Selector) -> AnyObject?
            let imp = method_getImplementation(method)
            let factory = unsafeBitCast(imp, to: EffectFactory.self)
            if let effect = factory(glassClass, selector) as? UIVisualEffect {
                return effect
            }
        }
        return nil
    }

    private func handleNativeTabTap(_ item: SpendWiseTabItem) {
        updateSelectedTab(item)
        sendNavigationEventToWeb(path: item.rawValue)
    }

    private func handleRouteMessage(_ body: Any) {
        var path: String?
        var isVisible: Bool?

        if let rawPath = body as? String {
            path = rawPath
        } else if let payload = body as? [String: Any] {
            path = payload["path"] as? String
            isVisible = payload["visible"] as? Bool
        }

        if let routePath = path {
            if let tab = tabItem(forPath: routePath) {
                updateSelectedTab(tab)
                if isVisible == nil {
                    isVisible = true
                }
            } else if isVisible == nil {
                isVisible = false
            }
        }

        guard let shouldShowTabBar = isVisible else { return }
        isTabBarHiddenForRoute = !shouldShowTabBar
        updateTabBarVisibility(animated: true)
    }

    private func handleModalMessage(_ body: Any) {
        guard let isOpen = body as? Bool else { return }
        isTabBarHiddenForModal = isOpen
        updateTabBarVisibility(animated: true)
    }

    private func updateSelectedTab(forPath path: String) {
        if let tab = tabItem(forPath: path) {
            updateSelectedTab(tab)
        }
    }

    private func tabItem(forPath path: String) -> SpendWiseTabItem? {
        if path.hasPrefix(SpendWiseTabItem.expenses.rawValue) { return .expenses }
        if path.hasPrefix(SpendWiseTabItem.budgets.rawValue) { return .budgets }
        if path.hasPrefix(SpendWiseTabItem.settings.rawValue) { return .settings }
        if path.hasPrefix(SpendWiseTabItem.dashboard.rawValue) { return .dashboard }
        return nil
    }

    private func updateSelectedTab(_ tab: SpendWiseTabItem) {
        selectedTab = tab
        for (item, button) in tabButtons {
            let isActive = (item == tab)
            button.backgroundColor = isActive ? UIColor.systemBlue.withAlphaComponent(0.22) : .clear
            button.layer.borderWidth = isActive ? 1 : 0
            button.layer.borderColor = UIColor.white.withAlphaComponent(0.18).cgColor

            var config = button.configuration
            config?.baseForegroundColor = isActive ? UIColor.systemBlue : UIColor.white.withAlphaComponent(0.72)
            button.configuration = config
        }
    }

    private func sendNavigationEventToWeb(path: String) {
        let payload: [String: String] = ["path": path]
        sendEventToWeb(eventName: "spendwise-native-navigate", detail: payload)
    }

    private func sendAddExpenseEventToWeb() {
        sendEventToWeb(eventName: "spendwise-native-add-expense", detail: nil)
    }

    private func sendEventToWeb(eventName: String, detail: [String: String]?) {
        guard let webView = bridge?.webView else { return }

        let script: String
        if let detail = detail,
           let data = try? JSONSerialization.data(withJSONObject: detail, options: []),
           let json = String(data: data, encoding: .utf8) {
            script = "window.dispatchEvent(new CustomEvent('\(eventName)', { detail: \(json) }));"
        } else {
            script = "window.dispatchEvent(new Event('\(eventName)'));"
        }

        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    private func observeKeyboardVisibility() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboardWillShow(_:)),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    @objc private func handleKeyboardWillShow(_ notification: Notification) {
        isTabBarHiddenForKeyboard = true
        updateTabBarVisibility(animated: true, notification: notification)
    }

    @objc private func handleKeyboardWillHide(_ notification: Notification) {
        isTabBarHiddenForKeyboard = false
        updateTabBarVisibility(animated: true, notification: notification)
    }

    private func updateTabBarVisibility(animated: Bool, notification: Notification? = nil) {
        let shouldHide = isTabBarHiddenForKeyboard || isTabBarHiddenForModal || isTabBarHiddenForRoute
        guard shouldHide != isTabBarCurrentlyHidden else { return }
        isTabBarCurrentlyHidden = shouldHide

        if animated {
            animateNativeTabBar(hidden: shouldHide, notification: notification)
            return
        }

        guard let container = tabContainerView else { return }
        container.alpha = shouldHide ? 0 : 1
        container.transform = shouldHide ? CGAffineTransform(translationX: 0, y: 120) : .identity
    }

    private func animateNativeTabBar(hidden: Bool, notification: Notification?) {
        guard let container = tabContainerView else { return }

        let duration = (notification?.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?.doubleValue ?? 0.25
        let curveRaw = (notification?.userInfo?[UIResponder.keyboardAnimationCurveUserInfoKey] as? NSNumber)?.uintValue ?? 7
        let options = UIView.AnimationOptions(rawValue: curveRaw << 16)

        UIView.animate(
            withDuration: duration,
            delay: 0,
            options: [options, .beginFromCurrentState],
            animations: {
                container.alpha = hidden ? 0 : 1
                container.transform = hidden
                    ? CGAffineTransform(translationX: 0, y: 120)
                    : .identity
            },
            completion: nil
        )
    }
}

private final class SheenOverlayView: UIView {
    private let gradient = CAGradientLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        backgroundColor = .clear
        gradient.colors = [
            UIColor.white.withAlphaComponent(0.18).cgColor,
            UIColor.white.withAlphaComponent(0.04).cgColor,
            UIColor.clear.cgColor,
        ]
        gradient.locations = [0, 0.22, 0.58]
        gradient.startPoint = CGPoint(x: 0.5, y: 0.0)
        gradient.endPoint = CGPoint(x: 0.5, y: 1.0)
        layer.addSublayer(gradient)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        gradient.frame = bounds
    }
}
