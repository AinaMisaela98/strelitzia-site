import ProfilePage from "@/components/ProfilePage";

export default function Page() {
  const user = {
    id: 0,
    name: "Administrateur",
    email: "admin@strelitzia.school",
    role: "ADMIN",
    profilePhoto: null,
  };

  return <ProfilePage user={user} />;
}
