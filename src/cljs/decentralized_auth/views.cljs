(ns decentralized-auth.views
  (:require [re-frame.core :refer [dispatch subscribe]]
            [reagent.core :as r]))


(defn format-root [root]
  (str (->> root (take 10) (apply str)) "......"))


(defn data-providers []
  (let [root     (subscribe [:data-provider/root])
        side-key (subscribe [:data-provider/side-key])]
    [:div.box.data-providers "Prosumer's Data Providers"
     [:br]
     [:span [:strong "Raspberry Pi"]]
     [:br]
     [:span "Side key: " @side-key]
     [:br]
     [:span "MAM root: " (format-root @root)]]))


(defn service-providers []
  (let [side-key   (subscribe [:service-provider/side-key])
        root       (subscribe [:service-provider/root])
        public-key "x"]
    [:div.box.service-providers "Independent Service Providers"
     [:br]
     [:span [:strong "Oma app."]]
     [:br]
     [:span "Public key: " public-key]
     [:br]
     [:span "Side key (encrypted): " (str public-key @side-key)]
     [:br]
     [:span "Next MAM root: " (format-root @root)]]))


(defn raspberry-pi-image []
  [:img {:src "images/raspi.png" :alt "Raspberry Pi" :width "25%"}])


(defn grandma-app-image []
  [:img {:src "images/grandma.png" :alt "Grandma app" :width "25%"}])


(defn prosumer-image []
  [:img {:src "images/prosumer.png" :alt "Prosumer" :width "10%"}])


(defn data-provider []
  (let [message  (r/atom "9ENERGYDATA9")
        side-key (subscribe [:data-provider/side-key])]
    (fn []
      [:div.box.data-provider "Data Provider (Raspberry Pi)"
       [:br]
       [raspberry-pi-image]
       [:br]
       [:span " Message: "]
       [:input {:type      "text"
                :value     @message
                :size      32
                :on-change #(reset! message (-> % .-target .-value))}]
       [:br]
       [:span " Side key: "]
       [:input {:type      "text"
                :value     @side-key
                :size      32
                :on-change #(dispatch
                             [:data-provider/change-mode
                              :restricted
                              (-> % .-target .-value)])}]
       [:br]
       [:button.btn.btn-default
        {:on-click #(dispatch [:data-provider/publish @message])}
        "Publish"]])))


(defn data []
  (let [authorized?          (subscribe [:service-provider/authorized?])
        latest-msg-timestamp (subscribe [:service-provider/latest-msg-timestamp])]
    (if @authorized?
      [:div.box.data-flow.authorized [:br] [:br] "Data flow allowed" [:br] "(authorized)"
       [:br]
       [:span "Last message: " @latest-msg-timestamp]]
      [:div.box.data-flow [:br] [:br] "Data flow disallowed" [:br] "(unauthorized)"])))


(defn messages-panel [messages]
  [:span "Messages: "
   (into [:ul]
    (map (fn [msg] [:li ^{:key msg} msg])
         messages))])


(defn service-provider []
  (let [root     (subscribe [:service-provider/root])
        side-key (subscribe [:service-provider/side-key])
        messages (subscribe [:service-provider/messages])]
    [:div.box.service-provider "Service Provider (Oma app)"
     [:br]
     [grandma-app-image]
     [:br]
     [messages-panel @messages]
     [:br]
     [:button.btn.btn-default
      {:on-click #(dispatch [:service-provider/fetch @root @side-key])}
      "Fetch"]
     [:br]]))


(defn prosumer []
  [:div.box.prosumer "Prosumer"
   [:br]
   [prosumer-image]
   [:br]
   [:button.btn.btn-default
    {:on-click #(dispatch [:prosumer/claim-pi])}
    "Claim Pi"]
   [:span " "]
   [:button.btn.btn-default
    {:on-click #(dispatch [:prosumer/authorize "oma-app" "x"])}
    "Authorize Oma app"]
   [:span " "]
   [:button.btn.btn-default
    {:on-click #(dispatch [:prosumer/revoke "oma-app" "x"])}
    "Revoke access to Oma app"]])


(defn smart-authorization-grid []
  [:div.wrapper
   [data-providers]       [service-providers]
   [data-provider] [data] [service-provider]
   [prosumer]])


(defn main-panel []
  [smart-authorization-grid])
